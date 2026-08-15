import asyncio
import base64
import hashlib
import hmac
import logging
import os
import struct
import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from urllib.parse import urlparse, unquote

from app.config.settings import settings

logger = logging.getLogger(__name__)


# ── BSON Serialization & Deserialization Engine ─────────────────────────


def encode_cstring(s: str) -> bytes:
    return s.encode("utf-8") + b"\x00"


def encode_element(name: str, value: Any) -> bytes:
    ename = encode_cstring(name)
    if value is None:
        return b"\x0a" + ename
    if isinstance(value, bool):
        return b"\x08" + ename + (b"\x01" if value else b"\x00")
    if isinstance(value, int):
        if -2147483648 <= value <= 2147483647:
            return b"\x10" + ename + struct.pack("<i", value)
        else:
            return b"\x12" + ename + struct.pack("<q", value)
    if isinstance(value, float):
        return b"\x01" + ename + struct.pack("<d", value)
    if isinstance(value, str):
        utf8 = value.encode("utf-8")
        return b"\x02" + ename + struct.pack("<i", len(utf8) + 1) + utf8 + b"\x00"
    if isinstance(value, datetime):
        millis = int(value.timestamp() * 1000)
        return b"\x09" + ename + struct.pack("<q", millis)
    if isinstance(value, uuid.UUID):
        return b"\x05" + ename + struct.pack("<i", 16) + b"\x04" + value.bytes
    if isinstance(value, dict):
        sub_doc = encode_document(value)
        return b"\x03" + ename + sub_doc
    if isinstance(value, (list, tuple)):
        sub_dict = {str(i): v for i, v in enumerate(value)}
        sub_doc = encode_document(sub_dict)
        return b"\x04" + ename + sub_doc
    if isinstance(value, (bytes, bytearray)):
        return b"\x05" + ename + struct.pack("<i", len(value)) + b"\x00" + bytes(value)

    utf8 = str(value).encode("utf-8")
    return b"\x02" + ename + struct.pack("<i", len(utf8) + 1) + utf8 + b"\x00"


def encode_document(doc: dict) -> bytes:
    body = b"".join(encode_element(k, v) for k, v in doc.items())
    length = len(body) + 5
    return struct.pack("<i", length) + body + b"\x00"


def decode_document(data: bytes, offset: int = 0) -> Tuple[dict, int]:
    doc_len = struct.unpack_from("<i", data, offset)[0]
    end_offset = offset + doc_len
    pos = offset + 4
    result = {}
    while pos < end_offset - 1:
        elem_type = data[pos]
        pos += 1
        null_pos = data.find(b"\x00", pos)
        elem_name = data[pos:null_pos].decode("utf-8", errors="replace")
        pos = null_pos + 1
        if elem_type == 0x01:  # double
            val = struct.unpack_from("<d", data, pos)[0]
            pos += 8
        elif elem_type == 0x02:  # string
            str_len = struct.unpack_from("<i", data, pos)[0]
            val = data[pos + 4 : pos + 4 + str_len - 1].decode("utf-8", errors="replace")
            pos += 4 + str_len
        elif elem_type == 0x03:  # embedded document
            val, sub_len = decode_document(data, pos)
            pos += sub_len
        elif elem_type == 0x04:  # array
            arr_doc, sub_len = decode_document(data, pos)
            pos += sub_len
            val = [arr_doc[str(i)] for i in range(len(arr_doc)) if str(i) in arr_doc]
        elif elem_type == 0x05:  # binary
            bin_len = struct.unpack_from("<i", data, pos)[0]
            subtype = data[pos + 4]
            bin_data = data[pos + 5 : pos + 5 + bin_len]
            pos += 5 + bin_len
            if subtype == 0x04:
                val = str(uuid.UUID(bytes=bin_data))
            else:
                val = bin_data
        elif elem_type == 0x07:  # ObjectId
            val = data[pos : pos + 12].hex()
            pos += 12
        elif elem_type == 0x08:  # bool
            val = bool(data[pos])
            pos += 1
        elif elem_type == 0x09:  # UTC datetime
            millis = struct.unpack_from("<q", data, pos)[0]
            val = datetime.fromtimestamp(millis / 1000.0, timezone.utc)
            pos += 8
        elif elem_type == 0x0A:  # null
            val = None
        elif elem_type == 0x10:  # int32
            val = struct.unpack_from("<i", data, pos)[0]
            pos += 4
        elif elem_type == 0x12:  # int64
            val = struct.unpack_from("<q", data, pos)[0]
            pos += 8
        else:
            break
        result[elem_name] = val
    return result, doc_len


# ── MongoDB Async Protocol & Connection Manager ─────────────────────────


class AsyncMongoConnection:
    def __init__(self, host: str, port: int, user: Optional[str], password: Optional[str], auth_db: str = "admin"):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.auth_db = auth_db
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None

    async def connect(self) -> None:
        self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
        if self.user and self.password:
            await self._authenticate_scram_sha256()

    async def _execute_raw(self, command_doc: dict) -> dict:
        body = encode_document(command_doc)
        section = b"\x00" + body
        msg_len = 16 + 4 + len(section)
        header = struct.pack("<iiii", msg_len, 1, 0, 2013)
        request = header + struct.pack("<i", 0) + section
        self.writer.write(request)
        await self.writer.drain()

        res_header = await self.reader.readexactly(16)
        resp_len, _, _, _ = struct.unpack("<iiii", res_header)
        res_body = await self.reader.readexactly(resp_len - 16)
        resp_doc, _ = decode_document(res_body, 5)
        return resp_doc

    async def _authenticate_scram_sha256(self) -> None:
        client_nonce = base64.b64encode(os.urandom(24)).decode("ascii")
        first_bare = f"n={self.user},r={client_nonce}"
        client_first_message = f"n,,{first_bare}"

        start_cmd = {
            "saslStart": 1,
            "mechanism": "SCRAM-SHA-256",
            "payload": client_first_message.encode("utf-8"),
            "autoAuthorize": 1,
            "$db": self.auth_db,
        }
        res = await self._execute_raw(start_cmd)
        if not res.get("ok"):
            raise Exception(f"saslStart failed: {res}")

        conversation_id = res["conversationId"]
        raw_payload = res["payload"]
        server_first = raw_payload if isinstance(raw_payload, str) else raw_payload.decode("utf-8", errors="replace")
        params = dict(item.split("=", 1) for item in server_first.split(","))
        server_nonce = params["r"]
        salt = base64.b64decode(params["s"])
        iterations = int(params["i"])

        salted_password = hashlib.pbkdf2_hmac("sha256", self.password.encode("utf-8"), salt, iterations)
        client_key = hmac.new(salted_password, b"Client Key", hashlib.sha256).digest()
        stored_key = hashlib.sha256(client_key).digest()

        client_final_without_proof = f"c=biws,r={server_nonce}"
        auth_message = f"{first_bare},{server_first},{client_final_without_proof}".encode("utf-8")
        client_signature = hmac.new(stored_key, auth_message, hashlib.sha256).digest()
        client_proof = bytes(a ^ b for a, b in zip(client_key, client_signature))
        client_final = f"{client_final_without_proof},p={base64.b64encode(client_proof).decode('ascii')}"

        continue_cmd = {
            "saslContinue": 1,
            "conversationId": conversation_id,
            "payload": client_final.encode("utf-8"),
            "$db": self.auth_db,
        }
        res2 = await self._execute_raw(continue_cmd)
        if not res2.get("ok"):
            raise Exception(f"saslContinue failed: {res2}")

        if not res2.get("done"):
            res3 = await self._execute_raw({
                "saslContinue": 1,
                "conversationId": conversation_id,
                "payload": b"",
                "$db": self.auth_db,
            })
            if not res3.get("ok"):
                raise Exception(f"Final saslContinue failed: {res3}")

    async def execute(self, command_doc: dict) -> dict:
        try:
            if self.writer is None or self.writer.is_closing():
                await self.connect()
            return await self._execute_raw(command_doc)
        except Exception:
            # Reconnect and retry once
            try:
                await self.close()
                await self.connect()
                return await self._execute_raw(command_doc)
            except Exception as e:
                logger.error(f"MongoDB command execution failed: {e}")
                raise

    async def close(self) -> None:
        if self.writer is not None:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
            self.writer = None
            self.reader = None


class MongoCollection:
    def __init__(self, db_name: str, col_name: str, pool: "MongoConnectionPool"):
        self.db_name = db_name
        self.col_name = col_name
        self.pool = pool

    async def insert_one(self, doc: dict) -> dict:
        cmd = {
            "insert": self.col_name,
            "documents": [doc],
            "$db": self.db_name,
        }
        return await self.pool.execute(cmd)

    async def insert_many(self, docs: List[dict]) -> dict:
        cmd = {
            "insert": self.col_name,
            "documents": docs,
            "$db": self.db_name,
        }
        return await self.pool.execute(cmd)

    async def find_one(self, filter_doc: dict) -> Optional[dict]:
        cmd = {
            "find": self.col_name,
            "filter": filter_doc,
            "limit": 1,
            "$db": self.db_name,
        }
        res = await self.pool.execute(cmd)
        batch = res.get("cursor", {}).get("firstBatch", [])
        return batch[0] if batch else None

    async def find(
        self,
        filter_doc: dict,
        sort: Optional[dict] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[dict]:
        cmd = {
            "find": self.col_name,
            "filter": filter_doc,
            "skip": skip,
            "limit": limit,
            "$db": self.db_name,
        }
        if sort:
            cmd["sort"] = sort
        res = await self.pool.execute(cmd)
        return res.get("cursor", {}).get("firstBatch", [])

    async def count_documents(self, filter_doc: dict) -> int:
        cmd = {
            "count": self.col_name,
            "query": filter_doc,
            "$db": self.db_name,
        }
        res = await self.pool.execute(cmd)
        return int(res.get("n", 0))

    async def update_one(self, filter_doc: dict, update_doc: dict) -> dict:
        cmd = {
            "update": self.col_name,
            "updates": [{"q": filter_doc, "u": update_doc, "multi": False}],
            "$db": self.db_name,
        }
        return await self.pool.execute(cmd)

    async def update_many(self, filter_doc: dict, update_doc: dict) -> dict:
        cmd = {
            "update": self.col_name,
            "updates": [{"q": filter_doc, "u": update_doc, "multi": True}],
            "$db": self.db_name,
        }
        return await self.pool.execute(cmd)

    async def create_index(self, key_spec: Any, unique: bool = False, sparse: bool = False) -> dict:
        keys_dict = {}
        if isinstance(key_spec, str):
            keys_dict[key_spec] = 1
        elif isinstance(key_spec, list):
            for item in key_spec:
                if isinstance(item, tuple):
                    keys_dict[item[0]] = item[1]
                else:
                    keys_dict[item] = 1
        elif isinstance(key_spec, dict):
            keys_dict = key_spec

        idx_name = "_".join(f"{k}_{v}" for k, v in keys_dict.items())
        idx_doc = {
            "key": keys_dict,
            "name": idx_name,
        }
        if unique:
            idx_doc["unique"] = True
        if sparse:
            idx_doc["sparse"] = True

        cmd = {
            "createIndexes": self.col_name,
            "indexes": [idx_doc],
            "$db": self.db_name,
        }
        return await self.pool.execute(cmd)


class MongoDatabase:
    def __init__(self, db_name: str, pool: "MongoConnectionPool"):
        self.db_name = db_name
        self.pool = pool

    def __getitem__(self, col_name: str) -> MongoCollection:
        return MongoCollection(self.db_name, col_name, self.pool)


class MongoConnectionPool:
    def __init__(self, mongodb_url: str):
        parsed = urlparse(mongodb_url)
        self.host = parsed.hostname or "localhost"
        self.port = parsed.port or 27017
        self.user = unquote(parsed.username) if parsed.username else None
        self.password = unquote(parsed.password) if parsed.password else None
        auth_source = "admin"
        if parsed.query:
            params = dict(p.split("=", 1) for p in parsed.query.split("&") if "=" in p)
            auth_source = params.get("authSource", "admin")
        self.auth_db = auth_source

        self._lock = asyncio.Lock()
        self._conn: Optional[AsyncMongoConnection] = None

    async def _get_connection(self) -> AsyncMongoConnection:
        if self._conn is None:
            self._conn = AsyncMongoConnection(self.host, self.port, self.user, self.password, self.auth_db)
            await self._conn.connect()
        return self._conn

    async def execute(self, command_doc: dict) -> dict:
        async with self._lock:
            conn = await self._get_connection()
            return await conn.execute(command_doc)

    async def ping(self) -> dict:
        return await self.execute({"ping": 1, "$db": "admin"})

    async def close(self) -> None:
        async with self._lock:
            if self._conn:
                await self._conn.close()
                self._conn = None


_global_pool: Optional[MongoConnectionPool] = None


def get_mongo_pool() -> MongoConnectionPool:
    global _global_pool
    if _global_pool is None:
        _global_pool = MongoConnectionPool(settings.mongodb_url)
    return _global_pool


def get_mongo_db() -> MongoDatabase:
    pool = get_mongo_pool()
    return MongoDatabase(settings.mongodb_db_name, pool)


async def init_mongo_indices() -> None:
    try:
        db = get_mongo_db()
        col = db["notifications"]
        await col.create_index([("user_id", 1), ("created_at", -1)])
        await col.create_index([("recipient_id", 1), ("created_at", -1)])
        await col.create_index("workspace_id")
        await col.create_index("id", unique=True)
        await col.create_index([("event_id", 1), ("user_id", 1)], sparse=True)
        logger.info("MongoDB notification indices initialized successfully.")
    except Exception as exc:
        logger.warning(f"Could not initialize MongoDB indices: {exc}")


async def close_mongo_client() -> None:
    global _global_pool
    if _global_pool is not None:
        await _global_pool.close()
        _global_pool = None
        logger.info("MongoDB connection closed.")


async def check_mongo_health() -> Tuple[bool, str]:
    try:
        pool = get_mongo_pool()
        res = await pool.ping()
        if res.get("ok") == 1.0 or res.get("ok") == 1:
            return True, "healthy"
        return False, f"unhealthy: {res}"
    except Exception as exc:
        return False, f"unhealthy: {exc}"
