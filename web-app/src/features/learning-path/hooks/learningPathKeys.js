/**
 * Canonical Query Key Factory for Learning Paths and AI Tutoring Units
 */
export const learningPathKeys = {
  all: ['learning-path'],
  paths: () => [...learningPathKeys.all, 'path'],
  path: (workspaceId) => [...learningPathKeys.paths(), workspaceId],
  units: (workspaceId) => [...learningPathKeys.all, 'unit', workspaceId],
  unit: (workspaceId, title) => [...learningPathKeys.units(workspaceId), title],
};

export default learningPathKeys;
