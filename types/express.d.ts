declare namespace Express {
    export interface Request {
        user?: {
            id: string;
            email: string;
            locale: string;
            names: {
                first: string;
                last: string;
            },
            birth: Date;
            avatar: string;
            token: string;
        };
        language?: string;
    }
    export interface Response {
        
    }
}
