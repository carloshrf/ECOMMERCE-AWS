#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';

const app = new cdk.App();

const env: cdk.Environment = {
    account: '',
    region: '',
};

const tags = {
    cost: 'ECommerce',
    team: 'CarlosCurso',
};

const productsAppLayersStack = new ProductsAppLayersStack(
    app,
    'ProductsAppLayers',
    {
        tags,
        env,
    }
);

const eventsDdbStack = new EventsDdbStack(app, 'EventsDdb', {
    tags,
    env,
});

const productsAppStack = new ProductAppStack(app, 'ProductsApp', {
    eventsDdb: eventsDdbStack.table,
    tags,
    env,
});

const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApi', {
    productsFetchHandler: productsAppStack.productsFetchHandler,
    productsAdminHandler: productsAppStack.productsAdminHandler,
    tags,
    env,
});

productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDdbStack);

eCommerceApiStack.addDependency(productsAppStack);

/* If you don't specify 'env', this stack will be environment-agnostic.
 * Account/Region-dependent features and context lookups will not work,
 * but a single synthesized template can be deployed anywhere. */

/* Uncomment the next line to specialize this stack for the AWS Account
 * and Region that are implied by the current CLI configuration. */
// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

/* Uncomment the next line if you know exactly what Account and Region you
 * want to deploy the stack to. */
// env: { account: '123456789012', region: 'us-east-1' },

/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
