import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';
import { Product, ProductRepository } from '/opt/nodejs/productsLayer';
import { DynamoDB, Lambda } from 'aws-sdk';
import { ProductEvent, ProductEventType } from '/opt/nodejs/productEventsLayer';
import * as AWSXRay from 'aws-xray-sdk';

// monitorar tempo gasto que é usado a partir do aws-sdk
AWSXRay.captureAWS(require('aws-sdk'));
const productsDdb = process.env.PRODUCTS_DDB!;
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;
const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();

const productRepository = new ProductRepository(ddbClient, productsDdb);

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

    if (event.resource === '/products' && method === 'POST') {
        console.log('POST /products');
        const product = JSON.parse(event.body!) as Product;

        const createdProduct = await productRepository.create(product);

        const eventResponse = await sendProductEvent(
            createdProduct,
            ProductEventType.CREATED,
            'teste@email.com.br',
            lambdaRequestId
        );

        console.log('event: ', eventResponse)

        return {
            statusCode: 201,
            body: JSON.stringify(createdProduct),
        };
    } else if (event.resource === '/products/{id}') {
        const productId = event.pathParameters!.id as string;

        if (method === 'PUT') {
            console.log(`PUT /products/${productId}`);
            
            const product = JSON.parse(event.body!) as Product;

            try {
                const updatedProduct = await productRepository.updateProduct(
                    productId,
                    product
                );

                const eventResponse = await sendProductEvent(
                    product,
                    ProductEventType.UPDATED,
                    'teste@email.com.br',
                    lambdaRequestId
                );
        
                console.log('event: ', eventResponse)

                return {
                    statusCode: 200,
                    body: JSON.stringify(updatedProduct),
                };
            } catch (ConditionalCheckFailedException) {
                return {
                    statusCode: 404,
                    body: 'Product not found',
                };
            }
        }

        if (method === 'DELETE') {
            console.log(`DELETE /products/${productId}`);

            try {
                const product = await productRepository.deleteProduct(
                    productId
                );

                const eventResponse = await sendProductEvent(
                    product,
                    ProductEventType.DELETED,
                    'teste@email.com.br',
                    lambdaRequestId
                );
        
                console.log('event: ', eventResponse)

                return {
                    statusCode: 200,
                    body: JSON.stringify(product),
                };
            } catch (error) {
                console.error((<Error>error).message);

                return {
                    statusCode: 404,
                    body: (<Error>error).message,
                };
            }
        }
    }

    return {
        statusCode: 400,
        body: 'Bad Request',
    };
}

function sendProductEvent(
    product: Product,
    eventType: ProductEventType,
    email: string,
    lambdaRequestId: string
) {
    const event: ProductEvent = {
        email: email,
        eventType: eventType,
        productCode: product.code,
        productId: product.id,
        productPrice: product.price,
        requestId: lambdaRequestId,
    };

    return lambdaClient
        .invoke({
            FunctionName: productEventsFunctionName,
            Payload: JSON.stringify(event),
            InvocationType: 'RequestResponse',
        })
        .promise();
}
