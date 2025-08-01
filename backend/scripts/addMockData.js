const { initializeDatabase, Component, Connector, Connection, ComponentGroup, ComponentGroupMembership } = require('../models');
const { buildConnections } = require('../utils/connectionBuilder');

// Simple, focused components with clear relationships
const sampleComponents = [
  // User Management System
  { name: "User Database", tag: "user_db", type: "DB", source: "database", domain: "user", description: "PostgreSQL database storing user accounts and profiles" },
  { name: "User Cache", tag: "user_cache", type: "STORAGE", source: "manual", domain: "user", description: "Redis cache for user sessions and frequently accessed data" },  
  { name: "User Service", tag: "user_service", type: "APP", source: "config_scan", domain: "user", description: "Core user management service handling authentication and profiles" },
  { name: "User API", tag: "user_api", type: "API", source: "swagger", domain: "user", description: "REST API endpoint for user operations" },
  { name: "User Data Pipeline", tag: "user_pipeline", type: "PIPES", source: "logs", domain: "user", description: "ETL pipeline processing user activity and analytics" },

  // Order Processing System  
  { name: "Order Database", tag: "order_db", type: "DB", source: "database", domain: "order", description: "MySQL database for order management and tracking" },
  { name: "Order Queue", tag: "order_queue", type: "STORAGE", source: "manual", domain: "order", description: "Message queue for order processing workflow" },
  { name: "Order Service", tag: "order_service", type: "APP", source: "config_scan", domain: "order", description: "Order processing service handling lifecycle management" },
  { name: "Order API", tag: "order_api", type: "API", source: "swagger", domain: "order", description: "GraphQL API for order operations" },
  { name: "Order Processing Pipeline", tag: "order_pipeline", type: "PIPES", source: "logs", domain: "order", description: "Real-time pipeline for order state changes and notifications" },

  // Payment System
  { name: "Payment Database", tag: "payment_db", type: "DB", source: "database", domain: "payment", description: "Secure database for payment transactions and history" },
  { name: "Payment Vault", tag: "payment_vault", type: "STORAGE", source: "manual", domain: "payment", description: "PCI-compliant storage for tokenized payment methods" },
  { name: "Payment Service", tag: "payment_service", type: "APP", source: "logs", domain: "payment", description: "Payment processing service with multiple gateway integrations" },
  { name: "Payment API", tag: "payment_api", type: "API", source: "swagger", domain: "payment", description: "Secure API for payment processing and wallet management" },
  { name: "Payment Analytics Pipeline", tag: "payment_pipeline", type: "PIPES", source: "logs", domain: "payment", description: "Pipeline for payment fraud detection and financial reporting" },

  // Analytics System
  { name: "Analytics Warehouse", tag: "analytics_db", type: "DB", source: "database", domain: "analytics", description: "Data warehouse aggregating business metrics from all systems" },
  { name: "Analytics Storage", tag: "analytics_storage", type: "STORAGE", source: "manual", domain: "analytics", description: "Data lake storing raw analytics events and ML training data" },
  { name: "Analytics Engine", tag: "analytics_service", type: "APP", source: "logs", domain: "analytics", description: "Real-time analytics engine generating insights and reports" },
  { name: "Analytics API", tag: "analytics_api", type: "API", source: "swagger", domain: "analytics", description: "API providing business intelligence and dashboard data" },
  { name: "Analytics ETL Pipeline", tag: "analytics_pipeline", type: "PIPES", source: "logs", domain: "analytics", description: "ETL pipeline processing data from all business domains" }
];

// Component Groups with overlapping inclusion relationships  
const sampleGroups = [
  {
    name: "Core Business Logic",
    description: "Complete user management and payment processing stacks",
    groupType: "FUNCTIONAL",
    domain: null,
    color: "#e74c3c",
    metadata: { criticality: "high", uptime: "99.9%", cross_domain: true }
  },
  {
    name: "Data Storage Layer", 
    description: "Persistent storage systems - databases, caches, and data warehouses",
    groupType: "PHYSICAL",
    domain: null,
    color: "#9b59b6",
    metadata: { backup_schedule: "daily", monitoring: "24/7", redundancy: "enabled" }
  },
  {
    name: "API Gateway Layer",
    description: "Public-facing APIs with supporting backend services", 
    groupType: "SERVICE",
    domain: null,
    color: "#2ecc71",
    metadata: { rate_limiting: "enabled", authentication: "required", load_balancing: "active" }
  },
  {
    name: "Order Processing Workflow",
    description: "Complete order management pipeline from request to fulfillment",
    groupType: "LOGICAL", 
    domain: "order",
    color: "#f39c12",
    metadata: { batch_schedule: "real-time", includes_analytics: true, cross_system: true }
  }
];

// Group memberships with varied inclusion relationships
const groupMemberships = [
  // Core Business Logic: Complete user and payment systems (cross-domain)
  { groupIndex: 0, componentTags: ["user_db", "user_cache", "user_service", "user_api"], role: "MEMBER" },
  { groupIndex: 0, componentTags: ["payment_db", "payment_vault", "payment_service", "payment_api"], role: "MEMBER" },
  { groupIndex: 0, componentTags: ["user_service"], role: "LEADER" }, // Primary business service
  
  // Data Storage Layer: Only databases and primary storage
  { groupIndex: 1, componentTags: ["user_db", "order_db", "payment_db", "analytics_db"], role: "MEMBER" },
  { groupIndex: 1, componentTags: ["user_cache", "payment_vault", "analytics_storage"], role: "MEMBER" },
  { groupIndex: 1, componentTags: ["analytics_db"], role: "LEADER" }, // Central data warehouse
  
  // API Gateway Layer: External APIs plus their core services
  { groupIndex: 2, componentTags: ["user_api", "order_api", "payment_api", "analytics_api"], role: "MEMBER" },
  { groupIndex: 2, componentTags: ["order_service", "analytics_service"], role: "MEMBER" }, // Supporting services
  { groupIndex: 2, componentTags: ["user_api"], role: "LEADER" }, // Authentication gateway
  
  // Data Processing Infrastructure: Order processing workflow (overlapping with other groups)
  { groupIndex: 3, componentTags: ["order_db", "order_queue", "order_service", "order_api"], role: "MEMBER" },
  { groupIndex: 3, componentTags: ["analytics_storage", "analytics_service"], role: "MEMBER" }, // Analytics support
  { groupIndex: 3, componentTags: ["order_service"], role: "LEADER" } // Core processing service
  
  // Note: PIPES components remain as individual nodes and are not assigned to any groups
];

const sampleConnectors = [
  {
    name: "Production Database",
    type: "database", 
    config: {
      host: "db.example.com",
      port: 5432,
      database: "production",
      username: "dataflow_user",
      password: "encrypted_password",
      type: "postgresql"
    },
    schedule: "0 */6 * * *", // Every 6 hours
    isActive: true
  },
  {
    name: "API Discovery", 
    type: "api",
    config: {
      swaggerUrl: "https://api.example.com/swagger.json",
      baseUrl: "https://api.example.com",
      authentication: {
        type: "bearer",
        token: "api_token"
      }
    },
    schedule: "0 */8 * * *", // Every 8 hours
    isActive: true
  },
  {
    name: "Application Logs",
    type: "logs",
    config: {
      path: "/var/log/app/*.log", 
      regex: "service:\\\\s*(\\\\w+)",
      watchMode: true
    },
    schedule: null, // Real-time
    isActive: true
  }
];

const seedDatabase = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    
    console.log('Creating sample connectors...');
    const createdConnectors = await Connector.bulkCreate(sampleConnectors);
    console.log(`✓ Created ${createdConnectors.length} connectors`);
    
    console.log('Creating sample components...');
    const componentsWithMetadata = sampleComponents.map((comp, index) => ({
      ...comp,
      metadata: {
        environment: index % 4 === 0 ? 'production' : index % 4 === 1 ? 'staging' : index % 4 === 2 ? 'development' : 'testing',
        version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.0`,
        lastHealthCheck: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        cpu: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 80) + 10,
        uptime: Math.floor(Math.random() * 720) + 24 // 1-30 days
      },
      connectorId: createdConnectors[index % createdConnectors.length].id
    }));
    
    const createdComponents = await Component.bulkCreate(componentsWithMetadata);
    console.log(`✓ Created ${createdComponents.length} components across ${[...new Set(sampleComponents.map(c => c.domain))].length} domains`);
    
    console.log('Creating component groups...');
    const createdGroups = await ComponentGroup.bulkCreate(sampleGroups);
    console.log(`✓ Created ${createdGroups.length} component groups`);
    
    console.log('Creating group memberships...');
    let totalMemberships = 0;
    const addedMemberships = new Set();
    
    for (const membership of groupMemberships) {
      const group = createdGroups[membership.groupIndex];
      
      for (const tag of membership.componentTags) {
        const component = createdComponents.find(c => c.tag === tag);
        if (component && group) {
          const membershipKey = `${component.id}-${group.id}`;
          
          if (addedMemberships.has(membershipKey)) {
            continue; // Skip duplicates
          }
          
          await ComponentGroupMembership.create({
            groupId: group.id,
            componentId: component.id,
            role: membership.role,
            metadata: {
              addedAt: new Date().toISOString(),
              automated: true,
              domain: component.domain
            }
          });
          
          addedMemberships.add(membershipKey);
          totalMemberships++;
        }
      }
    }
    console.log(`✓ Created ${totalMemberships} group memberships`);
    
    console.log('Building component connections...');
    const connectionCount = await buildConnections();
    console.log(`✓ Created ${connectionCount} connections`);
    
    console.log('\n🎉 Mock data creation completed successfully!');
    console.log('\n=== SUMMARY ===');
    console.log(`📊 Connectors: ${createdConnectors.length}`);
    console.log(`🔧 Components: ${createdComponents.length}`);
    console.log(`   ├─ DB: ${createdComponents.filter(c => c.type === 'DB').length}`);
    console.log(`   ├─ API: ${createdComponents.filter(c => c.type === 'API').length}`);
    console.log(`   ├─ APP: ${createdComponents.filter(c => c.type === 'APP').length}`);
    console.log(`   ├─ STORAGE: ${createdComponents.filter(c => c.type === 'STORAGE').length}`);
    console.log(`   └─ PIPES: ${createdComponents.filter(c => c.type === 'PIPES').length}`);
    console.log(`👥 Groups: ${createdGroups.length}`);
    console.log(`🔗 Group Memberships: ${totalMemberships}`);
    console.log(`⚡ Connections: ${connectionCount}`);
    console.log(`🌐 Domains: ${[...new Set(sampleComponents.map(c => c.domain))].length} (${[...new Set(sampleComponents.map(c => c.domain))].join(', ')})`);
    
    console.log('\n📋 COMPONENT RELATIONSHIPS:');
    console.log('Each domain (user, order, payment, analytics) contains:');
    console.log('  • Database (DB) → stores domain data');
    console.log('  • Storage (STORAGE) → caches/queues for performance');
    console.log('  • Service (APP) → business logic processor');  
    console.log('  • API (API) → external interface');
    console.log('  • Pipeline (PIPES) → data processing workflow');
    console.log('\n🏗️  GROUPS ORGANIZE COMPONENTS BY:');
    console.log('  • Core Business Logic → All APP services');
    console.log('  • Data Storage Layer → All DB + STORAGE components');
    console.log('  • API Gateway Layer → All API endpoints');
    console.log('  • Data Processing → All PIPES components');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating mock data:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleComponents, sampleConnectors };