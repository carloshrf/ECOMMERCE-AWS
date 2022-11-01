import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';

export async function handler(
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> {
    const method = event.httpMethod;
    const apiRequestId = event.requestContext.requestId;
    const lambdaRequestId = context.awsRequestId;

    console.log(
        `API Gateway RequestId: ${apiRequestId} | Lambda RequestId: ${lambdaRequestId}`
    );

    if (event.resource === '/products') {
        if (method === 'GET') {
            console.log('GET de produtos');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'GET de products - OK',
                }),
            };
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: 'Bad Request',
        }),
    };
}
