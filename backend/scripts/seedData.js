const { initializeDatabase, Component, Connector, Connection, ComponentGroup, ComponentGroupMembership } = require('../models');
const { buildConnections } = require('../utils/connectionBuilder');

const sampleComponents = [
  // E-commerce Platform - Full Stack with Storage and Pipes
  
  // User Management Domain
  { name: "User Database", tag: "user_db", type: "DB", source: "database", description: "Primary PostgreSQL database for user profiles, authentication, and preferences" },
  { name: "User Profile Cache", tag: "user_storage", type: "STORAGE", source: "manual", description: "Redis cache for frequently accessed user profiles and session data" },
  { name: "User Data Pipeline", tag: "user_pipes", type: "PIPES", source: "logs", description: "ETL pipeline for user data processing and analytics" },
  { name: "User Management Service", tag: "user_app", type: "APP", source: "config_scan", description: "Microservice handling user registration, authentication, and profile management" },
  { name: "User API Gateway", tag: "user_api", type: "API", source: "swagger", description: "GraphQL API for user operations with rate limiting and authentication" },

  // Product Catalog Domain
  { name: "Product Database", tag: "product_db", type: "DB", source: "database", description: "MongoDB database storing product information, categories, and metadata" },
  { name: "Product Media Storage", tag: "product_storage", type: "STORAGE", source: "manual", description: "AWS S3 bucket for product images, videos, and documentation" },
  { name: "Product Search Pipeline", tag: "product_pipes", type: "PIPES", source: "logs", description: "Elasticsearch indexing pipeline for product search and recommendations" },
  { name: "Catalog Service", tag: "product_app", type: "APP", source: "logs", description: "Product catalog management service with inventory sync" },
  { name: "Product API", tag: "product_api", type: "API", source: "swagger", description: "REST API for product catalog operations and search" },

  // Order Processing Domain
  { name: "Order Database", tag: "order_db", type: "DB", source: "database", description: "Transactional database for order processing and fulfillment tracking" },
  { name: "Order Event Store", tag: "order_storage", type: "STORAGE", source: "manual", description: "Event sourcing store for order state changes and audit trail" },
  { name: "Order Processing Pipeline", tag: "order_pipes", type: "PIPES", source: "logs", description: "Apache Kafka pipeline for order events, notifications, and integrations" },
  { name: "Order Service", tag: "order_app", type: "APP", source: "config_scan", description: "Order management service handling cart, checkout, and fulfillment" },
  { name: "Order API", tag: "order_api", type: "API", source: "swagger", description: "RESTful API for order creation, tracking, and management" },

  // Payment Processing Domain
  { name: "Payment Database", tag: "payment_db", type: "DB", source: "database", description: "Encrypted database for payment records and transaction history" },
  { name: "Payment Vault", tag: "payment_storage", type: "STORAGE", source: "manual", description: "PCI-compliant vault for storing tokenized payment methods" },
  { name: "Payment Processing Pipeline", tag: "payment_pipes", type: "PIPES", source: "logs", description: "Real-time pipeline for payment processing, fraud detection, and reconciliation" },
  { name: "Payment Gateway", tag: "payment_app", type: "APP", source: "logs", description: "Payment processing service with multiple provider integration" },
  { name: "Payment API", tag: "payment_api", type: "API", source: "swagger", description: "Secure API for payment processing and wallet management" },

  // Inventory Management Domain
  { name: "Inventory Database", tag: "inventory_db", type: "DB", source: "database", description: "Real-time inventory tracking database with stock levels and locations" },
  { name: "Inventory Cache", tag: "inventory_storage", type: "STORAGE", source: "manual", description: "High-performance cache for inventory lookups and availability checks" },
  { name: "Inventory Sync Pipeline", tag: "inventory_pipes", type: "PIPES", source: "logs", description: "Real-time pipeline syncing inventory across warehouses and channels" },
  { name: "Inventory Service", tag: "inventory_app", type: "APP", source: "config_scan", description: "Inventory management service with demand forecasting" },
  { name: "Inventory API", tag: "inventory_api", type: "API", source: "swagger", description: "API for inventory queries, reservations, and stock management" },

  // Analytics & Reporting Domain
  { name: "Analytics Warehouse", tag: "analytics_db", type: "DB", source: "database", description: "Data warehouse with historical sales, user behavior, and business metrics" },
  { name: "Analytics Data Lake", tag: "analytics_storage", type: "STORAGE", source: "manual", description: "S3-based data lake for raw analytics data and machine learning datasets" },
  { name: "Analytics ETL Pipeline", tag: "analytics_pipes", type: "PIPES", source: "logs", description: "Complex ETL pipeline for data aggregation, cleansing, and ML feature engineering" },
  { name: "Analytics Engine", tag: "analytics_app", type: "APP", source: "logs", description: "Real-time analytics engine with dashboard generation and alerting" },
  { name: "Analytics API", tag: "analytics_api", type: "API", source: "swagger", description: "API for business intelligence, reporting, and data visualization" },

  // Notification System Domain
  { name: "Notification Database", tag: "notification_db", type: "DB", source: "database", description: "Database for notification templates, delivery status, and user preferences" },
  { name: "Message Queue", tag: "notification_storage", type: "STORAGE", source: "manual", description: "RabbitMQ message queue for reliable notification delivery" },
  { name: "Notification Pipeline", tag: "notification_pipes", type: "PIPES", source: "logs", description: "Multi-channel notification pipeline (email, SMS, push, webhook)" },
  { name: "Notification Service", tag: "notification_app", type: "APP", source: "config_scan", description: "Notification orchestration service with template management" },
  { name: "Notification API", tag: "notification_api", type: "API", source: "swagger", description: "API for sending notifications and managing delivery preferences" },

  // Content Management Domain
  { name: "Content Database", tag: "content_db", type: "DB", source: "database", description: "CMS database for pages, blogs, marketing content, and metadata" },
  { name: "Content CDN", tag: "content_storage", type: "STORAGE", source: "manual", description: "CloudFront CDN for global content delivery and caching" },
  { name: "Content Processing Pipeline", tag: "content_pipes", type: "PIPES", source: "logs", description: "Pipeline for content optimization, image processing, and SEO indexing" },
  { name: "CMS Service", tag: "content_app", type: "APP", source: "logs", description: "Headless CMS service for content management and publishing workflows" },
  { name: "Content API", tag: "content_api", type: "API", source: "swagger", description: "GraphQL API for content delivery and management operations" },

  // Monitoring & Logging Domain
  { name: "Metrics Database", tag: "monitoring_db", type: "DB", source: "database", description: "Time-series database for application metrics, performance data, and alerts" },
  { name: "Log Storage", tag: "monitoring_storage", type: "STORAGE", source: "manual", description: "Elasticsearch cluster for centralized log storage and search" },
  { name: "Observability Pipeline", tag: "monitoring_pipes", type: "PIPES", source: "logs", description: "Pipeline for metrics collection, log aggregation, and distributed tracing" },
  { name: "Monitoring Service", tag: "monitoring_app", type: "APP", source: "config_scan", description: "APM service with alerting, dashboards, and incident management" },
  { name: "Monitoring API", tag: "monitoring_api", type: "API", source: "swagger", description: "API for metrics queries, alerting configuration, and health checks" }
];

// Component Groups - Logical groupings of related components
const sampleGroups = [
  {
    name: "Customer Experience",
    description: "Front-end services directly impacting customer interactions",
    groupType: "FUNCTIONAL",
    domain: null,
    color: "#2ecc71",
    metadata: { priority: "high", criticality: "customer-facing" }
  },
  {
    name: "Data Processing Platform",
    description: "ETL pipelines and data processing infrastructure",
    groupType: "LOGICAL",
    domain: null,
    color: "#f39c12",
    metadata: { type: "data-infrastructure", performance: "critical" }
  },
  {
    name: "Storage Infrastructure",
    description: "All storage systems including databases, caches, and file storage",
    groupType: "PHYSICAL",
    domain: null,
    color: "#9b59b6",
    metadata: { backup: "required", monitoring: "24/7" }
  },
  {
    name: "Business Intelligence",
    description: "Analytics and reporting systems for business insights",
    groupType: "FUNCTIONAL", 
    domain: "analytics",
    color: "#3498db",
    metadata: { users: "business-analysts", schedule: "daily-reports" }
  },
  {
    name: "Core Services",
    description: "Essential platform services that other services depend on",
    groupType: "SERVICE",
    domain: null,
    color: "#e74c3c",
    metadata: { availability: "99.99%", scaling: "auto" }
  },
  {
    name: "E-commerce Order Flow",
    description: "Complete order processing workflow from cart to fulfillment",
    groupType: "FUNCTIONAL",
    domain: "order",
    color: "#16a085",
    metadata: { workflow: "order-to-cash", integration: "payment-gateway" }
  }
];

// Group memberships - which components belong to which groups
const groupMemberships = [
  // Customer Experience Group
  { groupIndex: 0, componentTags: ["user_api", "product_api", "order_api", "content_api"], role: "MEMBER" },
  
  // Data Processing Platform Group  
  { groupIndex: 1, componentTags: ["user_pipes", "product_pipes", "order_pipes", "payment_pipes", "inventory_pipes", "analytics_pipes", "notification_pipes", "content_pipes", "monitoring_pipes"], role: "MEMBER" },
  
  // Storage Infrastructure Group
  { groupIndex: 2, componentTags: ["user_storage", "product_storage", "order_storage", "payment_storage", "inventory_storage", "analytics_storage", "notification_storage", "content_storage", "monitoring_storage"], role: "MEMBER" },
  { groupIndex: 2, componentTags: ["user_db", "product_db", "order_db", "payment_db", "inventory_db", "analytics_db", "notification_db", "content_db", "monitoring_db"], role: "MEMBER" },
  
  // Business Intelligence Group
  { groupIndex: 3, componentTags: ["analytics_db", "analytics_storage", "analytics_pipes", "analytics_app", "analytics_api"], role: "MEMBER" },
  
  // Core Services Group
  { groupIndex: 4, componentTags: ["user_app", "payment_app", "notification_app", "monitoring_app"], role: "MEMBER" },
  { groupIndex: 4, componentTags: ["user_api"], role: "LEADER" }, // User API is the primary auth service
  
  // E-commerce Order Flow Group
  { groupIndex: 5, componentTags: ["product_db", "product_app", "product_api"], role: "DEPENDENCY" },
  { groupIndex: 5, componentTags: ["order_db", "order_storage", "order_pipes", "order_app", "order_api"], role: "MEMBER" },
  { groupIndex: 5, componentTags: ["payment_db", "payment_app", "payment_api"], role: "MEMBER" },
  { groupIndex: 5, componentTags: ["inventory_db", "inventory_app", "inventory_api"], role: "MEMBER" },
  { groupIndex: 5, componentTags: ["order_app"], role: "LEADER" }
];

const sampleConnectors = [
  {
    name: "Production PostgreSQL",
    type: "database",
    config: {
      host: "prod-postgres.example.com",
      port: 5432,
      database: "production",
      username: "dataflow_user",
      password: "encrypted_password",
      type: "postgresql",
      tables: ["users", "orders", "payments", "inventory"]
    },
    schedule: "0 */6 * * *", // Every 6 hours
    isActive: true
  },
  {
    name: "Microservices API Gateway",
    type: "api",
    config: {
      swaggerUrl: "https://api.example.com/swagger.json",
      baseUrl: "https://api.example.com",
      authentication: {
        type: "bearer",
        token: "sample_token"
      }
    },
    schedule: "0 */12 * * *", // Every 12 hours
    isActive: true
  },
  {
    name: "Application Logs",
    type: "logs",
    config: {
      path: "/var/log/app/*.log",
      regex: "service:\\s*(\\w+)",
      watchMode: true
    },
    schedule: null, // Real-time watching
    isActive: true
  },
  {
    name: "Analytics Data Warehouse",
    type: "database",
    config: {
      host: "analytics-db.example.com",
      port: 5432,
      database: "analytics",
      username: "analytics_user",
      password: "encrypted_password",
      type: "postgresql",
      tables: "all"
    },
    schedule: "0 2 * * *", // Daily at 2 AM
    isActive: true
  },
  {
    name: "Internal APIs",
    type: "api",
    config: {
      baseUrl: "https://internal.example.com",
      endpoints: [
        { path: "/health", method: "GET" },
        { path: "/metrics", method: "GET" },
        { path: "/api/v1/status", method: "GET" }
      ]
    },
    schedule: "*/30 * * * *", // Every 30 minutes
    isActive: true
  }
];

const seedDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Clearing existing data...');
    await ComponentGroupMembership.destroy({ where: {} });
    await ComponentGroup.destroy({ where: {} });
    await Connection.destroy({ where: {} });
    await Component.destroy({ where: {} });
    await Connector.destroy({ where: {} });
    
    console.log('Creating sample connectors...');
    const createdConnectors = await Connector.bulkCreate(sampleConnectors);
    console.log(`Created ${createdConnectors.length} connectors`);
    
    console.log('Creating sample components...');
    const componentsWithMetadata = sampleComponents.map((comp, index) => ({
      ...comp,
      metadata: {
        discoveredAt: new Date().toISOString(),
        sampleData: true,
        region: index % 3 === 0 ? 'us-east-1' : index % 3 === 1 ? 'us-west-2' : 'eu-west-1',
        environment: index % 4 === 0 ? 'production' : index % 4 === 1 ? 'staging' : index % 4 === 2 ? 'development' : 'testing',
        version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
        lastHealthCheck: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time in last hour
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        connections: Math.floor(Math.random() * 1000)
      },
      connectorId: createdConnectors[Math.floor(Math.random() * createdConnectors.length)].id
    }));
    
    const createdComponents = await Component.bulkCreate(componentsWithMetadata);
    console.log(`Created ${createdComponents.length} components`);
    
    console.log('Creating component groups...');
    const createdGroups = await ComponentGroup.bulkCreate(sampleGroups);
    console.log(`Created ${createdGroups.length} groups`);
    
    console.log('Creating group memberships...');
    let totalMemberships = 0;
    const addedMemberships = new Set(); // Track to avoid duplicates
    
    for (const membership of groupMemberships) {
      const group = createdGroups[membership.groupIndex];
      
      for (const tag of membership.componentTags) {
        const component = createdComponents.find(c => c.tag === tag);
        if (component && group) {
          const membershipKey = `${component.id}-${group.id}`;
          
          // Skip if this component-group combination already exists
          if (addedMemberships.has(membershipKey)) {
            console.log(`Skipping duplicate membership: ${tag} -> ${group.name}`);
            continue;
          }
          
          await ComponentGroupMembership.create({
            groupId: group.id,
            componentId: component.id,
            role: membership.role,
            metadata: {
              addedAt: new Date().toISOString(),
              automated: true
            }
          });
          
          addedMemberships.add(membershipKey);
          totalMemberships++;
        }
      }
    }
    console.log(`Created ${totalMemberships} group memberships`);
    
    console.log('Building connections...');
    const connectionCount = await buildConnections();
    console.log(`Created ${connectionCount} connections`);
    
    console.log('Sample data seeding completed successfully!');
    console.log('\n=== Summary ===');
    console.log(`Connectors: ${createdConnectors.length}`);
    console.log(`Components: ${createdComponents.length}`);
    console.log(`Groups: ${createdGroups.length}`);
    console.log(`Group Memberships: ${totalMemberships}`);
    console.log(`Connections: ${connectionCount}`);
    console.log(`Domains: ${[...new Set(sampleComponents.map(c => c.tag.split('_')[0]))].length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleComponents, sampleConnectors };