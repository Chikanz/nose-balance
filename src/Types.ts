export interface Player {
    box: Matter.Body; 
    constraint: Matter.Constraint;
    lastPosition: Position;
    alive: boolean;
}

export interface Position {
    x: number;
    y: number;
}