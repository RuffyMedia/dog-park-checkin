export type RootStackParamList = {
  Auth: undefined;
  DogProfile: {
    mode?: 'create' | 'edit';
    returnToTab?: keyof MainTabParamList;
  } | undefined;
  Main: {
    screen?: keyof MainTabParamList;
  } | undefined;
};

export type MainTabParamList = {
  Park: undefined;
  'Park Analytics': undefined;
  'Check-In': undefined;
  Profile: undefined;
};

