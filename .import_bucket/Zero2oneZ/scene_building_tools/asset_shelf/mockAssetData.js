// mockAssetData.js - Mock data for the asset library

export const assetCategories = [
  {
    id: 'models',
    name: 'Models',
    type: 'model',
  },
  {
    id: 'textures',
    name: 'Textures',
    type: 'texture',
  },
  {
    id: 'materials',
    name: 'Materials',
    type: 'material',
  },
  {
    id: 'characters',
    name: 'Characters',
    type: 'character',
  },
  {
    id: 'props',
    name: 'Props',
    type: 'prop',
  },
  {
    id: 'environments',
    name: 'Environments',
    type: 'environment',
  },
  {
    id: 'lights',
    name: 'Lights',
    type: 'light',
  },
  {
    id: 'cameras',
    name: 'Cameras',
    type: 'camera',
  },
  {
    id: 'animations',
    name: 'Animations',
    type: 'animation',
  },
  {
    id: 'audio',
    name: 'Audio',
    type: 'audio',
  },
];

export const assetLibrary = {
  // Models
  'model-1': {
    id: 'model-1',
    name: 'Cube',
    type: 'model',
    category: 'models',
    tags: ['primitive', 'basic'],
    thumbnail: null,
    path: '/assets/models/cube.glb',
    createdAt: '2025-10-01T12:00:00Z',
    updatedAt: '2025-10-01T12:00:00Z',
  },
  'model-2': {
    id: 'model-2',
    name: 'Sphere',
    type: 'model',
    category: 'models',
    tags: ['primitive', 'basic'],
    thumbnail: null,
    path: '/assets/models/sphere.glb',
    createdAt: '2025-10-01T12:00:00Z',
    updatedAt: '2025-10-01T12:00:00Z',
  },
  'model-3': {
    id: 'model-3',
    name: 'Cylinder',
    type: 'model',
    category: 'models',
    tags: ['primitive', 'basic'],
    thumbnail: null,
    path: '/assets/models/cylinder.glb',
    createdAt: '2025-10-01T12:00:00Z',
    updatedAt: '2025-10-01T12:00:00Z',
  },
  'model-4': {
    id: 'model-4',
    name: 'Modern Chair',
    type: 'model',
    category: 'props',
    tags: ['furniture', 'chair', 'modern'],
    thumbnail: null,
    path: '/assets/models/modern_chair.glb',
    createdAt: '2025-10-02T14:30:00Z',
    updatedAt: '2025-10-02T14:30:00Z',
  },
  'model-5': {
    id: 'model-5',
    name: 'Office Desk',
    type: 'model',
    category: 'props',
    tags: ['furniture', 'desk', 'office'],
    thumbnail: null,
    path: '/assets/models/office_desk.glb',
    createdAt: '2025-10-02T15:45:00Z',
    updatedAt: '2025-10-02T15:45:00Z',
  },
  
  // Characters
  'character-1': {
    id: 'character-1',
    name: 'Default Male',
    type: 'character',
    category: 'characters',
    tags: ['human', 'male', 'rigged'],
    thumbnail: null,
    path: '/assets/characters/default_male.glb',
    createdAt: '2025-10-03T09:20:00Z',
    updatedAt: '2025-10-03T09:20:00Z',
  },
  'character-2': {
    id: 'character-2',
    name: 'Default Female',
    type: 'character',
    category: 'characters',
    tags: ['human', 'female', 'rigged'],
    thumbnail: null,
    path: '/assets/characters/default_female.glb',
    createdAt: '2025-10-03T09:25:00Z',
    updatedAt: '2025-10-03T09:25:00Z',
  },
  'character-3': {
    id: 'character-3',
    name: 'Robot Assistant',
    type: 'character',
    category: 'characters',
    tags: ['robot', 'sci-fi', 'rigged'],
    thumbnail: null,
    path: '/assets/characters/robot_assistant.glb',
    createdAt: '2025-10-03T10:15:00Z',
    updatedAt: '2025-10-03T10:15:00Z',
  },
  
  // Textures
  'texture-1': {
    id: 'texture-1',
    name: 'Wood Planks',
    type: 'texture',
    category: 'textures',
    tags: ['wood', 'planks', 'floor'],
    thumbnail: null,
    path: '/assets/textures/wood_planks.jpg',
    createdAt: '2025-10-04T11:30:00Z',
    updatedAt: '2025-10-04T11:30:00Z',
  },
  'texture-2': {
    id: 'texture-2',
    name: 'Brick Wall',
    type: 'texture',
    category: 'textures',
    tags: ['brick', 'wall', 'building'],
    thumbnail: null,
    path: '/assets/textures/brick_wall.jpg',
    createdAt: '2025-10-04T11:45:00Z',
    updatedAt: '2025-10-04T11:45:00Z',
  },
  'texture-3': {
    id: 'texture-3',
    name: 'Metal Scratched',
    type: 'texture',
    category: 'textures',
    tags: ['metal', 'scratched', 'industrial'],
    thumbnail: null,
    path: '/assets/textures/metal_scratched.jpg',
    createdAt: '2025-10-04T12:00:00Z',
    updatedAt: '2025-10-04T12:00:00Z',
  },
  
  // Materials
  'material-1': {
    id: 'material-1',
    name: 'Polished Gold',
    type: 'material',
    category: 'materials',
    tags: ['metal', 'gold', 'polished'],
    thumbnail: null,
    path: '/assets/materials/polished_gold.json',
    createdAt: '2025-10-05T13:15:00Z',
    updatedAt: '2025-10-05T13:15:00Z',
  },
  'material-2': {
    id: 'material-2',
    name: 'Brushed Aluminum',
    type: 'material',
    category: 'materials',
    tags: ['metal', 'aluminum', 'brushed'],
    thumbnail: null,
    path: '/assets/materials/brushed_aluminum.json',
    createdAt: '2025-10-05T13:30:00Z',
    updatedAt: '2025-10-05T13:30:00Z',
  },
  'material-3': {
    id: 'material-3',
    name: 'Car Paint Red',
    type: 'material',
    category: 'materials',
    tags: ['paint', 'car', 'red', 'glossy'],
    thumbnail: null,
    path: '/assets/materials/car_paint_red.json',
    createdAt: '2025-10-05T13:45:00Z',
    updatedAt: '2025-10-05T13:45:00Z',
  },
  
  // Environments
  'environment-1': {
    id: 'environment-1',
    name: 'City Street',
    type: 'environment',
    category: 'environments',
    tags: ['city', 'street', 'urban'],
    thumbnail: null,
    path: '/assets/environments/city_street.glb',
    createdAt: '2025-10-06T14:00:00Z',
    updatedAt: '2025-10-06T14:00:00Z',
  },
  'environment-2': {
    id: 'environment-2',
    name: 'Forest Clearing',
    type: 'environment',
    category: 'environments',
    tags: ['forest', 'nature', 'clearing'],
    thumbnail: null,
    path: '/assets/environments/forest_clearing.glb',
    createdAt: '2025-10-06T14:30:00Z',
    updatedAt: '2025-10-06T14:30:00Z',
  },
  
  // Lights
  'light-1': {
    id: 'light-1',
    name: 'Studio Lights Setup',
    type: 'light',
    category: 'lights',
    tags: ['studio', 'setup', 'professional'],
    thumbnail: null,
    path: '/assets/lights/studio_setup.json',
    createdAt: '2025-10-07T15:00:00Z',
    updatedAt: '2025-10-07T15:00:00Z',
  },
  'light-2': {
    id: 'light-2',
    name: 'Sunset Lighting',
    type: 'light',
    category: 'lights',
    tags: ['sunset', 'warm', 'natural'],
    thumbnail: null,
    path: '/assets/lights/sunset.json',
    createdAt: '2025-10-07T15:15:00Z',
    updatedAt: '2025-10-07T15:15:00Z',
  },
  
  // Animations
  'animation-1': {
    id: 'animation-1',
    name: 'Walk Cycle',
    type: 'animation',
    category: 'animations',
    tags: ['walk', 'cycle', 'locomotion'],
    thumbnail: null,
    path: '/assets/animations/walk_cycle.fbx',
    createdAt: '2025-10-08T16:00:00Z',
    updatedAt: '2025-10-08T16:00:00Z',
  },
  'animation-2': {
    id: 'animation-2',
    name: 'Idle Pose',
    type: 'animation',
    category: 'animations',
    tags: ['idle', 'pose', 'standing'],
    thumbnail: null,
    path: '/assets/animations/idle_pose.fbx',
    createdAt: '2025-10-08T16:15:00Z',
    updatedAt: '2025-10-08T16:15:00Z',
  },
  'animation-3': {
    id: 'animation-3',
    name: 'Jump',
    type: 'animation',
    category: 'animations',
    tags: ['jump', 'action'],
    thumbnail: null,
    path: '/assets/animations/jump.fbx',
    createdAt: '2025-10-08T16:30:00Z',
    updatedAt: '2025-10-08T16:30:00Z',
  },
};

export const favoriteAssets = [
  'model-4', // Modern Chair
  'model-5', // Office Desk
  'character-1', // Default Male
  'texture-1', // Wood Planks
  'material-1', // Polished Gold
];

export const recentAssets = [
  'animation-1', // Walk Cycle
  'animation-2', // Idle Pose
  'light-2', // Sunset Lighting
  'environment-2', // Forest Clearing
  'character-3', // Robot Assistant
  'model-3', // Cylinder
  'texture-3', // Metal Scratched
];
