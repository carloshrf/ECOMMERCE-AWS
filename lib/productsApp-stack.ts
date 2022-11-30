import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';

interface ProductsAppStackProps extends cdk.StackProps {
    eventsDdb: dynamodb.Table;
}

export class ProductAppStack extends cdk.Stack {
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction;
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction;
    readonly productsDdb: dynamodb.Table;

    constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
        super(scope, id, props);

        this.productsDdb = new dynamodb.Table(this, 'ProductsDdb', {
            tableName: 'products',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1,
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING,
            },
        });

        // Products layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(
            this,
            'ProductsLayerVersionArn'
        );
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(
            this,
            'ProductsLayerVersionArn',
            productsLayerArn
        );

        // Product Events Layer
        const productEventsLayerArn =
            ssm.StringParameter.valueForStringParameter(
                this,
                'ProductEventsLayerVersionArn'
            );
        const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
            this,
            'ProductEventsLayerVersionArn',
            productEventsLayerArn
        );

        const productEventsHandler = new lambdaNodeJS.NodejsFunction(
            this,
            'ProductsEventsFunction',
            {
                functionName: 'ProductsEventsFunction',
                entry: 'lambda/products/productsEventsFunction.ts',
                handler: 'handler',
                memorySize: 128,
                timeout: cdk.Duration.seconds(2),
                bundling: {
                    minify: true,
                    sourceMap: false,
                },
                environment: {
                    EVENTS_DDB: props.eventsDdb.tableName,
                },
                layers: [productEventsLayer],
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            }
        );

        props.eventsDdb.grantWriteData(productEventsHandler);

        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
            this,
            'ProductsFetchFunction',
            {
                functionName: 'ProductsFetchFunction',
                entry: 'lambda/products/productsFetchFunction.ts',
                handler: 'handler',
                memorySize: 128,
                timeout: cdk.Duration.seconds(5),
                bundling: {
                    minify: true,
                    sourceMap: false,
                },
                environment: {
                    PRODUCTS_DDB: this.productsDdb.tableName,
                },
                layers: [productsLayer],
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            }
        );
        this.productsDdb.grantReadData(this.productsFetchHandler);

        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(
            this,
            'ProductsAdminFunction',
            {
                functionName: 'ProductsAdminFunction',
                entry: 'lambda/products/productsAdminFunction.ts',
                handler: 'handler',
                memorySize: 128,
                timeout: cdk.Duration.seconds(5),
                bundling: {
                    minify: true,
                    sourceMap: false,
                },
                environment: {
                    PRODUCTS_DDB: this.productsDdb.tableName,
                    PRODUCT_EVENTS_FUNCTION_NAME:
                        productEventsHandler.functionName,
                },
                layers: [productsLayer, productEventsLayer],
                tracing: lambda.Tracing.ACTIVE,
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            }
        );

        this.productsDdb.grantWriteData(this.productsAdminHandler);
        productEventsHandler.grantInvoke(this.productsAdminHandler);
    }
}
