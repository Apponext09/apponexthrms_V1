import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex, closeKnex } from '../knex';

export async function seedLocationManagementData() {
  try {
    console.log('🚀 Initializing database connection for Location Management seed...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    // 1. Ensure table `branches` exists
    const hasBranches = await db.schema.hasTable('branches');
    if (!hasBranches) {
      console.log('📦 Table branches does not exist. Creating schema...');
      await db.schema.createTable('branches', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.string('name', 100).notNullable();
        table.string('code', 50).notNullable();
        table.string('address_line1', 255).nullable();
        table.string('address_line2', 255).nullable();
        table.string('city', 100).nullable();
        table.string('state', 100).nullable();
        table.string('country', 100).nullable();
        table.string('postal_code', 20).nullable();
        table.string('phone', 50).nullable();
        table.string('email', 100).nullable();
        table.string('website', 255).nullable();
        table.integer('branch_head_id').unsigned().nullable();
        table.boolean('is_primary').defaultTo(false);
        table.string('status', 20).defaultTo('active');
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table branches created successfully!\n');
    }

    // 2. Ensure table `locations` exists
    const hasLocations = await db.schema.hasTable('locations');
    if (!hasLocations) {
      console.log('📦 Table locations does not exist. Creating schema...');
      await db.schema.createTable('locations', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.string('name', 100).notNullable();
        table.string('code', 50).notNullable();
        table.string('type', 20).defaultTo('office');
        table.integer('branch_id').unsigned().nullable();
        table.string('address_line1', 255).nullable();
        table.string('address_line2', 255).nullable();
        table.string('city', 100).nullable();
        table.string('state', 100).nullable();
        table.string('country', 100).nullable();
        table.string('postal_code', 20).nullable();
        table.decimal('latitude', 10, 8).nullable();
        table.decimal('longitude', 11, 8).nullable();
        table.integer('geofence_radius_m').defaultTo(500);
        table.string('timezone', 50).defaultTo('Asia/Kolkata');
        table.string('status', 20).defaultTo('active');
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table locations created successfully!\n');
    }

    // 3. Ensure table `attendance_locations` exists
    const hasAttendanceLocations = await db.schema.hasTable('attendance_locations');
    if (!hasAttendanceLocations) {
      console.log('📦 Table attendance_locations does not exist. Creating schema...');
      await db.schema.createTable('attendance_locations', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.string('location_name', 100).notNullable();
        table.string('location_code', 50).notNullable();
        table.integer('branch_id').unsigned().nullable();
        table.text('address').nullable();
        table.decimal('latitude', 10, 8).nullable();
        table.decimal('longitude', 11, 8).nullable();
        table.string('timezone', 50).defaultTo('Asia/Kolkata');
        table.boolean('is_primary').defaultTo(false);
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table attendance_locations created successfully!\n');
    }

    // 4. Ensure table `attendance_geofences` exists
    const hasGeofences = await db.schema.hasTable('attendance_geofences');
    if (!hasGeofences) {
      console.log('📦 Table attendance_geofences does not exist. Creating schema...');
      await db.schema.createTable('attendance_geofences', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.integer('location_id').unsigned().nullable();
        table.string('geofence_name', 100).notNullable();
        table.decimal('latitude', 10, 8).notNullable();
        table.decimal('longitude', 11, 8).notNullable();
        table.integer('radius_meters').defaultTo(500);
        table.string('ip_address', 100).nullable();
        table.boolean('is_office_location').defaultTo(true);
        table.boolean('allows_remote_work').defaultTo(false);
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table attendance_geofences created successfully!\n');
    }

    // 5. Ensure table `employee_attendance_locations` exists
    const hasEmpLocations = await db.schema.hasTable('employee_attendance_locations');
    if (!hasEmpLocations) {
      console.log('📦 Table employee_attendance_locations does not exist. Creating schema...');
      await db.schema.createTable('employee_attendance_locations', (table) => {
        table.increments('id').primary();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.integer('employee_id').unsigned().notNullable();
        table.integer('geofence_id').unsigned().notNullable();
        table.boolean('is_primary').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('✅ Table employee_attendance_locations created successfully!\n');
    }

    // Fetch primary organization ID & valid admin user ID
    const org = await db('organizations').first();
    const orgId = org ? org.id : 1;

    const user = await db('users').where('organization_id', orgId).first() || await db('users').first();
    const adminUserId = user ? user.id : null;

    console.log(`👤 Resolved Organization ID: ${orgId}, Admin User ID: ${adminUserId || 'N/A'}`);

    // Disable Foreign Key checks for clean seeding
    await db.raw('SET FOREIGN_KEY_CHECKS = 0;');

    try {
      console.log(`🧹 Clearing existing location management records for Organization ID: ${orgId}...`);
      await db('employee_attendance_locations').where('organization_id', orgId).delete();
      await db('attendance_geofences').where('organization_id', orgId).delete();
      await db('attendance_locations').where('organization_id', orgId).delete();
      await db('locations').where('organization_id', orgId).delete();
      await db('branches').where('organization_id', orgId).delete();

      console.log('🌱 Inserting Branches seed data...');

      const branchesData = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Headquarters (HQ Branch)',
          code: 'BR-HQ-01',
          address_line1: '100 Innovation Boulevard, Cyber City',
          address_line2: 'Phase 2, Tech Zone',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postal_code: '400051',
          phone: '+91 22 5555 0100',
          email: 'hq@apponext.com',
          website: 'https://apponext.com',
          is_primary: true,
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Tech & Engineering Hub',
          code: 'BR-BLR-02',
          address_line1: 'Outer Ring Road, Marathahalli',
          address_line2: 'Block B, Embassy TechVillage',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          postal_code: '560103',
          phone: '+91 80 4444 0200',
          email: 'blr-hub@apponext.com',
          website: 'https://apponext.com',
          is_primary: false,
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'North Region Office',
          code: 'BR-DEL-03',
          address_line1: 'DLF Cyber City, Tower 10',
          address_line2: 'Sector 24',
          city: 'Gurugram',
          state: 'Haryana',
          country: 'India',
          postal_code: '122002',
          phone: '+91 124 3333 0300',
          email: 'delhi@apponext.com',
          website: 'https://apponext.com',
          is_primary: false,
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
      ];

      const insertedBranchIds: number[] = [];
      for (const b of branchesData) {
        const [id] = await db('branches').insert(b);
        insertedBranchIds.push(id);
      }
      console.log(`✅ Inserted ${insertedBranchIds.length} branches.`);

      console.log('🌱 Inserting Settings Work Locations seed data...');

      const locationsData = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Main HQ Office Building',
          code: 'LOC-HQ-MAIN',
          type: 'office',
          branch_id: insertedBranchIds[0] || null,
          address_line1: '100 Innovation Boulevard, Cyber City',
          address_line2: 'Floors 4-8',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postal_code: '400051',
          latitude: 19.07609000,
          longitude: 72.87742600,
          geofence_radius_m: 300,
          timezone: 'Asia/Kolkata',
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Bengaluru Tech Park Campus',
          code: 'LOC-BLR-CAMPUS',
          type: 'office',
          branch_id: insertedBranchIds[1] || null,
          address_line1: 'Outer Ring Road, Embassy TechVillage',
          address_line2: 'Building 3, 2nd Floor',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          postal_code: '560103',
          latitude: 12.92501000,
          longitude: 77.68902000,
          geofence_radius_m: 500,
          timezone: 'Asia/Kolkata',
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Client Onsite Operations',
          code: 'LOC-ONSITE-CLIENT',
          type: 'work',
          branch_id: insertedBranchIds[0] || null,
          address_line1: 'Bandra Kurla Complex (BKC)',
          address_line2: 'Financial Tower',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          postal_code: '400051',
          latitude: 19.06570000,
          longitude: 72.86870000,
          geofence_radius_m: 800,
          timezone: 'Asia/Kolkata',
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          name: 'Remote / Field Work Base',
          code: 'LOC-REMOTE-FIELD',
          type: 'work',
          branch_id: null,
          address_line1: 'Flexible Field Location',
          address_line2: 'Remote Operations',
          city: 'Pan-India',
          state: 'All States',
          country: 'India',
          postal_code: '000000',
          latitude: 20.59368400,
          longitude: 78.96288000,
          geofence_radius_m: 5000,
          timezone: 'Asia/Kolkata',
          status: 'active',
          created_by: adminUserId,
          updated_by: adminUserId,
        },
      ];

      const insertedLocIds: number[] = [];
      for (const loc of locationsData) {
        const [id] = await db('locations').insert(loc);
        insertedLocIds.push(id);
      }
      console.log(`✅ Inserted ${insertedLocIds.length} work locations.`);

      console.log('🌱 Inserting Attendance Locations seed data...');

      const attendanceLocationsData = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_name: 'HQ Campus - Main Gate & Kiosk',
          location_code: 'ATT-LOC-HQ',
          branch_id: insertedBranchIds[0] || null,
          address: '100 Innovation Blvd, Cyber City, Mumbai',
          latitude: 19.07609000,
          longitude: 72.87742600,
          timezone: 'Asia/Kolkata',
          is_primary: true,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_name: 'Bengaluru Tech Park - Biometric Terminal',
          location_code: 'ATT-LOC-BLR',
          branch_id: insertedBranchIds[1] || null,
          address: 'Outer Ring Road, Embassy TechVillage, Bengaluru',
          latitude: 12.92501000,
          longitude: 77.68902000,
          timezone: 'Asia/Kolkata',
          is_primary: false,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_name: 'Gurugram North Office Gate',
          location_code: 'ATT-LOC-DEL',
          branch_id: insertedBranchIds[2] || null,
          address: 'DLF Cyber City Tower 10, Gurugram',
          latitude: 28.49500000,
          longitude: 77.08900000,
          timezone: 'Asia/Kolkata',
          is_primary: false,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
      ];

      const insertedAttLocIds: number[] = [];
      for (const attLoc of attendanceLocationsData) {
        const [id] = await db('attendance_locations').insert(attLoc);
        insertedAttLocIds.push(id);
      }
      console.log(`✅ Inserted ${insertedAttLocIds.length} attendance locations.`);

      console.log('🌱 Inserting Attendance Geofences seed data...');

      const geofencesData = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_id: insertedAttLocIds[0] || null,
          geofence_name: 'HQ Office Geofence (300m Radius)',
          latitude: 19.07609000,
          longitude: 72.87742600,
          radius_meters: 300,
          ip_address: '192.168.1.0/24, 10.0.0.0/16',
          is_office_location: true,
          allows_remote_work: false,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_id: insertedAttLocIds[1] || null,
          geofence_name: 'Bengaluru Tech Park Geofence (500m Radius)',
          latitude: 12.92501000,
          longitude: 77.68902000,
          radius_meters: 500,
          ip_address: '172.16.0.0/16',
          is_office_location: true,
          allows_remote_work: false,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          location_id: insertedAttLocIds[0] || 1,
          geofence_name: 'Approved Remote & Hybrid Geofence Zone',
          latitude: 19.07609000,
          longitude: 72.87742600,
          radius_meters: 20000,
          ip_address: null,
          is_office_location: false,
          allows_remote_work: true,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
      ];

      const insertedGeofenceIds: number[] = [];
      for (const gf of geofencesData) {
        const [id] = await db('attendance_geofences').insert(gf);
        insertedGeofenceIds.push(id);
      }
      console.log(`✅ Inserted ${insertedGeofenceIds.length} attendance geofences.`);

      console.log('🌱 Mapping Employees to Geofences...');
      const users = await db('users').where('organization_id', orgId).select('id');
      const employeeIds = users.length > 0 ? users.map((u: any) => u.id) : (adminUserId ? [adminUserId] : []);

      const empLocationRows: any[] = [];
      for (const empId of employeeIds) {
        if (insertedGeofenceIds[0]) {
          empLocationRows.push({
            organization_id: orgId,
            employee_id: empId,
            geofence_id: insertedGeofenceIds[0],
            is_primary: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      if (empLocationRows.length > 0) {
        await db('employee_attendance_locations').insert(empLocationRows);
        console.log(`✅ Mapped ${empLocationRows.length} employees to primary geofence.`);
      }

      console.log('\n✨ Location Management Seed completed successfully!');
      console.log(`   - Branches: ${insertedBranchIds.length}`);
      console.log(`   - Work Locations: ${insertedLocIds.length}`);
      console.log(`   - Attendance Locations: ${insertedAttLocIds.length}`);
      console.log(`   - Attendance Geofences: ${insertedGeofenceIds.length}`);
      console.log(`   - Employee Mappings: ${empLocationRows.length}`);
    } finally {
      await db.raw('SET FOREIGN_KEY_CHECKS = 1;');
    }
  } catch (err) {
    console.error('❌ Error seeding Location Management data:', err);
    throw err;
  } finally {
    await closeKnex();
  }
}

// Execute script
seedLocationManagementData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
