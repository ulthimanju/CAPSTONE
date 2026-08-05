export class User {
  constructor({ id, email, name, pictureUrl, role, createdAt, updatedAt }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.pictureUrl = pictureUrl;
    this.role = role;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export class UserMapper {
  static toDomain(dto) {
    if (!dto) return null;
    return new User({
      id: dto.id,
      email: dto.email,
      name: dto.name,
      pictureUrl: dto.picture_url || dto.pictureUrl,
      role: dto.role,
      createdAt: dto.created_at ? new Date(dto.created_at) : null,
      updatedAt: dto.updated_at ? new Date(dto.updated_at) : null,
    });
  }
}
