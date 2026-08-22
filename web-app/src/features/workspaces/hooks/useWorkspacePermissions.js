import { useCurrentUser } from '@/features/auth/hooks/useAuth';

/**
 * Custom hook to compute authoritative workspace permissions and roles
 * for the currently authenticated user.
 *
 * @param {Object} workspace - The workspace object (or detail data)
 * @param {Object} [currentMember] - Optional member object for the current user
 * @returns {{
 *   isOwner: boolean,
 *   isAdmin: boolean,
 *   isCollaborator: boolean,
 *   isOwnerOrAdmin: boolean,
 *   canManageMembers: boolean,
 *   canEditWorkspace: boolean,
 *   canArchiveWorkspace: boolean,
 *   canDeleteWorkspace: boolean,
 *   canTransferOwnership: boolean,
 *   callerRole: 'OWNER' | 'ADMIN' | 'COLLABORATOR' | 'VIEWER',
 *   currentUser: Object|null
 * }}
 */
export function useWorkspacePermissions(workspace, currentMember = null) {
  const { user: currentUser } = useCurrentUser();

  const isOwner = Boolean(
    currentUser &&
    (workspace?.user_role === 'OWNER' ||
     workspace?.owner_id === currentUser?.id ||
     workspace?.created_by === currentUser?.id)
  );

  const callerRole = isOwner
    ? 'OWNER'
    : (currentMember?.role || workspace?.user_role || 'VIEWER');

  const isAdmin = callerRole === 'ADMIN';
  const isCollaborator = callerRole === 'COLLABORATOR' || callerRole === 'MEMBER';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const canManageMembers = isOwnerOrAdmin;
  const canEditWorkspace = isOwnerOrAdmin;
  const canArchiveWorkspace = isOwner;
  const canDeleteWorkspace = isOwner;
  const canTransferOwnership = isOwner;

  return {
    isOwner,
    isAdmin,
    isCollaborator,
    isOwnerOrAdmin,
    canManageMembers,
    canEditWorkspace,
    canArchiveWorkspace,
    canDeleteWorkspace,
    canTransferOwnership,
    callerRole,
    currentUser,
  };
}

export default useWorkspacePermissions;
