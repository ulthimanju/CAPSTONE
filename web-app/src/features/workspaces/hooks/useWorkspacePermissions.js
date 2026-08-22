import { useCurrentUser } from '@/features/auth/hooks/useAuth';
import { WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS } from '../schemas/workspaceSchemas';

export { WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS };

/**
 * Custom hook to compute authoritative workspace permissions and roles
 * for the currently authenticated user using canonical role names:
 * OWNER, ADMIN, EDITOR, VIEWER.
 *
 * @param {Object} workspace - The workspace object (or detail data)
 * @param {Object} [currentMember] - Optional member object for the current user
 * @returns {{
 *   isOwner: boolean,
 *   isAdmin: boolean,
 *   isEditor: boolean,
 *   isViewer: boolean,
 *   isOwnerOrAdmin: boolean,
 *   canManageMembers: boolean,
 *   canEditWorkspace: boolean,
 *   canArchiveWorkspace: boolean,
 *   canDeleteWorkspace: boolean,
 *   canTransferOwnership: boolean,
 *   callerRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER',
 *   roleDisplayLabel: string,
 *   currentUser: Object|null
 * }}
 */
export function useWorkspacePermissions(workspace, currentMember = null) {
  const { user: currentUser } = useCurrentUser();

  const isOwner = Boolean(
    currentUser &&
    (workspace?.user_role === WORKSPACE_ROLES.OWNER ||
     workspace?.owner_id === currentUser?.id ||
     workspace?.created_by === currentUser?.id)
  );

  const rawRole = isOwner
    ? WORKSPACE_ROLES.OWNER
    : (currentMember?.role || workspace?.user_role || WORKSPACE_ROLES.VIEWER);

  // Normalize to canonical role enum (fallback to VIEWER)
  const callerRole = [
    WORKSPACE_ROLES.OWNER,
    WORKSPACE_ROLES.ADMIN,
    WORKSPACE_ROLES.EDITOR,
    WORKSPACE_ROLES.VIEWER,
  ].includes(rawRole)
    ? rawRole
    : WORKSPACE_ROLES.VIEWER;

  const isAdmin = callerRole === WORKSPACE_ROLES.ADMIN;
  const isEditor = callerRole === WORKSPACE_ROLES.EDITOR;
  const isViewer = callerRole === WORKSPACE_ROLES.VIEWER;

  const isOwnerOrAdmin = isOwner || isAdmin;
  const canManageMembers = isOwnerOrAdmin;
  const canEditWorkspace = isOwnerOrAdmin;
  const canArchiveWorkspace = isOwner;
  const canDeleteWorkspace = isOwner;
  const canTransferOwnership = isOwner;

  // 4 Core Capability Domains
  const canAccessWorkspace = true;
  const canManageWorkspace = isOwnerOrAdmin;
  // File Uploads & Document Management are strictly restricted to the OWNER
  const canUploadDocuments = isOwner;
  const canManageContent = isOwner;
  const canGenerateLearningContent = isOwner || isAdmin || isEditor;
  const canTakeQuiz = true;

  const roleDisplayLabel = WORKSPACE_ROLE_LABELS[callerRole] || 'Viewer';

  return {
    isOwner,
    isAdmin,
    isEditor,
    isViewer,
    isOwnerOrAdmin,
    canManageMembers,
    canEditWorkspace,
    canArchiveWorkspace,
    canDeleteWorkspace,
    canTransferOwnership,
    canAccessWorkspace,
    canManageWorkspace,
    canUploadDocuments,
    canManageContent,
    canGenerateLearningContent,
    canTakeQuiz,
    callerRole,
    roleDisplayLabel,
    currentUser,
  };
}

export default useWorkspacePermissions;
