export type StationType = 'PREP' | 'STOVE' | 'OVEN' | 'GARNISH' | 'SERVE' | 'TABLE' | 'NONE';

export interface Dish {
  id: string;
  name: string;
  icon: string; // Emoji or icon name
  steps: StationType[];
  points: number;
  color: string;
}

export interface Order {
  id: string;
  dish: Dish;
  currentStepIndex: number;
  startTime: number;
  limitTime: number;
  isVIP?: boolean;
}

export interface GameState {
  score: number;
  orders: Order[];
  chefPos: { x: number; y: number };
  isGameOver: boolean;
  timeLeft: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Popup {
  id: string;
  x: number;
  y: number;
  text: string;
}
