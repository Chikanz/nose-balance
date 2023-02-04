export interface Player {
    box: Matter.Body; 
    constraint: Matter.Constraint;
    lastPosition: Position;
    alive: boolean;
    color: string;
    posBuffer: Position[];
}

export interface Position {
    x: number;
    y: number;
}