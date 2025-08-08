'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the ENUM type for tags (if not exists)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_components_tag_new AS ENUM ('PIPS', 'SOX', 'HR', 'Proj', 'Infra', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Remove existing unique constraint on tag
    await queryInterface.sequelize.query('ALTER TABLE components DROP CONSTRAINT IF EXISTS components_tag_key');
    
    // Backup existing tag data by converting strings to single-element arrays
    await queryInterface.sequelize.query(`
      ALTER TABLE components ADD COLUMN IF NOT EXISTS tag_backup TEXT;
      UPDATE components SET tag_backup = tag WHERE tag_backup IS NULL;
    `);
    
    // Drop the existing tag column
    await queryInterface.removeColumn('components', 'tag');
    
    // Add the new tag column as an array of the enum type
    await queryInterface.sequelize.query(`
      ALTER TABLE components ADD COLUMN tag enum_components_tag_new[] DEFAULT '{"Other"}' NOT NULL;
    `);
    
    // Convert backed up data to array format (default to 'Other' for existing records)
    await queryInterface.sequelize.query(`
      UPDATE components SET tag = ARRAY['Other']::enum_components_tag_new[] WHERE tag_backup IS NOT NULL;
    `);
    
    // Remove backup column
    await queryInterface.removeColumn('components', 'tag_backup');
    
    // Add GIN index for array searching
    await queryInterface.addIndex('components', {
      fields: ['tag'],
      using: 'gin',
      name: 'components_tag_gin_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the GIN index
    await queryInterface.removeIndex('components', 'components_tag_gin_idx');
    
    // Convert array tags back to strings (take first element)
    await queryInterface.sequelize.query(`
      ALTER TABLE components ADD COLUMN tag_backup TEXT;
      UPDATE components SET tag_backup = tag[1];
    `);
    
    // Remove the array column
    await queryInterface.removeColumn('components', 'tag');
    
    // Add back the original string tag column
    await queryInterface.addColumn('components', 'tag', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
    
    // Restore data
    await queryInterface.sequelize.query(`
      UPDATE components SET tag = COALESCE(tag_backup, 'default_tag_' || id::text);
    `);
    
    // Remove backup column
    await queryInterface.removeColumn('components', 'tag_backup');
    
    // Drop the ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_components_tag_new;
    `);
  }
};