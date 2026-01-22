import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Trello Clone API',
            version: '1.0.0',
            description: 'API for Trello Clone application'
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Development' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.ts', './src/schemas/*.ts'] // Added schemas path for better documentation potential
};

export const swaggerSpec = swaggerJsdoc(options);
