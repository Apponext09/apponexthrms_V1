#!/usr/bin/env node
/**
 * Seed tracking data for Yash Kale
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = 'Aqil@123';
const DB_NAME = process.env.DB_NAME || 'hrms';

// Extended Pune route for Yash Kale
const YASH_ROUTE = [
  { lat: 18.5210, lng: 73.8584 },  // Start - Koregaon Park
  { lat: 18.5215, lng: 73.8590 },
  { lat: 18.5220, lng: 73.8596 },
  { lat: 18.5225, lng: 73.8602 },
  { lat: 18.5230, lng: 73.8608 },
  { lat: 18.5235, lng: 73.8614 },
  { lat: 18.5235, lng: 73.8614 }, // BREAK 1
  { lat: 18.5235, lng: 73.8614 },
  { lat: 18.5235, lng: 73.8614 },
  { lat: 18.5235, lng: 73.8614 },
  { lat: 18.5235, lng: 73.8614 },
  { lat: 18.5240, lng: 73.8620 },
  { lat: 18.5245, lng: 73.8626 },
  { lat: 18.5250, lng: 73.8632 },
  { lat: 18.5255, lng: 73.8638 },
  { lat: 18.5260, lng: 73.8644 },
  { lat: 18.5265, lng: 73.8650 },
  { lat: 18.5270, lng: 73.8656 },
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5275, lng: 73.8662 }, // BREAK 2
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5275, lng: 73.8662 },
  { lat: 18.5280, lng: 73.8668 },
  { lat: 18.5285, lng: 73.8674 },
  { lat: 18.5290, lng: 73.8680 },
  { lat: 18.5295, lng: 73.8686 },
  { lat: 18.5300, lng: 73.8692 },
  { lat: 18.5305, lng: 73.8698 },
  { lat: 18.5310, lng: 73.8704 },
  { lat: 18.5315, lng: 73.8710 }, // End
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toMysqlDatetime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function generateBreadcrumbsFromRoute(orgId, empId, route, date, startHourUTC) {
  const points = [];
  let time = new Date(date);
  time.setUTCHours(startHourUTC, 0, 0, 0);

  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    const noise = 0.00005;
    const lat = point.lat + (Math.random() - 0.5) * noise;
    const lng = point.lng + (Math.random() - 0.5) * noise;

    points.push({
      organization_id: orgId,
      employee_id: empId,
      latitude: lat,
      longitude: lng,
      accuracy: 5 + Math.random() * 8,
      speed: i > 0 && route[i].lat === route[i - 1].lat ? 0 : 12 + Math.random() * 28,
      recorded_at: toMysqlDatetime(time),
      created_at: toMysqlDatetime(time),
    });

    time = new Date(time.getTime() + 90_000);
  }

  return points;
}

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    console.log('✅ Connected to database');

    // Find Yash Kale employee
    const [employees] = await conn.execute(`
      SELECT e.id, e.organization_id, e.first_name, e.last_name, e.email
      FROM employees e
      WHERE (LOWER(e.first_name) LIKE '%yash%' OR LOWER(e.last_name) LIKE '%kale%' OR LOWER(CONCAT(e.first_name, ' ', e.last_name)) LIKE '%yash%kale%')
      AND e.status IN ('active', 'probation')
      AND e.deleted_at IS NULL
      LIMIT 1
    `);

    if (employees.length === 0) {
      console.log('❌ Yash Kale employee not found');
      console.log('\n📝 Searching for similar names...');

      const [allEmps] = await conn.execute(`
        SELECT id, first_name, last_name, email
        FROM employees
        WHERE status IN ('active', 'probation')
        AND deleted_at IS NULL
        LIMIT 10
      `);

      console.log('Active employees:');
      allEmps.forEach(e => {
        console.log(`  - ${e.first_name} ${e.last_name} (ID: ${e.id})`);
      });

      return;
    }

    const emp = employees[0];
    const orgId = emp.organization_id;
    const empId = emp.id;
    const empName = `${emp.first_name} ${emp.last_name}`;

    console.log(`\n✅ Found: ${empName} (ID: ${empId})`);
    console.log(`   Email: ${emp.email}`);
    console.log(`   Organization: ${orgId}`);

    const today = new Date();
    const dateString = dateStr(today);

    console.log(`\n📍 Seeding ${empName} for ${dateString}`);

    // Delete existing data
    await conn.execute(
      `DELETE FROM employee_location_history WHERE organization_id = ? AND employee_id = ? AND DATE(recorded_at) = ?`,
      [orgId, empId, dateString]
    );
    console.log(`  🗑️  Cleared old data`);

    // Generate breadcrumbs
    const breadcrumbs = generateBreadcrumbsFromRoute(orgId, empId, YASH_ROUTE, today, 3);
    console.log(`  📝 Generated ${breadcrumbs.length} breadcrumbs`);

    // Insert in batches
    for (let j = 0; j < breadcrumbs.length; j += 100) {
      const batch = breadcrumbs.slice(j, j + 100);
      await conn.query(
        `INSERT INTO employee_location_history (organization_id, employee_id, latitude, longitude, accuracy, speed, recorded_at, created_at) VALUES ?`,
        [[...batch.map(p => [
          p.organization_id, p.employee_id, p.latitude, p.longitude,
          p.accuracy, p.speed, p.recorded_at, p.created_at
        ])]]
      );
    }
    console.log(`  ✅ Inserted ${breadcrumbs.length} records`);

    // Update live location
    const lastPt = breadcrumbs[breadcrumbs.length - 1];
    await conn.execute(
      `INSERT INTO employee_live_locations (organization_id, employee_id, latitude, longitude, location_status, connection_status, last_ping_at)
       VALUES (?, ?, ?, ?, 'ON', 'ONLINE', ?)
       ON DUPLICATE KEY UPDATE
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        location_status = 'ON',
        connection_status = 'ONLINE',
        last_ping_at = VALUES(last_ping_at)`,
      [orgId, empId, lastPt.latitude, lastPt.longitude, lastPt.recorded_at]
    );
    console.log(`  📍 Live location: (${lastPt.latitude.toFixed(4)}, ${lastPt.longitude.toFixed(4)})`);

    // Calculate metrics
    const totalDistance = YASH_ROUTE.length * 0.0155;
    const breakMinutes = Math.max(15, Math.ceil(breadcrumbs.length * 1.5 / 60 * 0.30));
    const totalMinutes = Math.ceil(breadcrumbs.length * 1.5 / 60);
    const workingMinutes = Math.max(1, totalMinutes - breakMinutes);

    // Insert session metrics
    await conn.execute(
      `INSERT INTO employee_tracking_sessions
       (organization_id, employee_id, session_date, session_start, session_end,
        total_working_minutes, total_break_minutes, break_count, total_distance_km, ping_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        session_start = VALUES(session_start),
        session_end = VALUES(session_end),
        total_working_minutes = VALUES(total_working_minutes),
        total_break_minutes = VALUES(total_break_minutes),
        break_count = VALUES(break_count),
        total_distance_km = VALUES(total_distance_km),
        ping_count = VALUES(ping_count)`,
      [
        orgId, empId, dateString,
        breadcrumbs[0].recorded_at,
        breadcrumbs[breadcrumbs.length - 1].recorded_at,
        workingMinutes, breakMinutes, 2, parseFloat(totalDistance.toFixed(2)), breadcrumbs.length
      ]
    );

    console.log(`\n  📊 Session Metrics:`);
    console.log(`     Working time: ${workingMinutes} minutes`);
    console.log(`     Break time: ${breakMinutes} minutes`);
    console.log(`     Break count: 2`);
    console.log(`     Total distance: ${totalDistance.toFixed(2)}km`);
    console.log(`     GPS pings: ${breadcrumbs.length}`);

    console.log(`\n✅ ✅ ✅ Yash Kale data seeded successfully!\n`);
    console.log(`Route Details:`);
    console.log(`  📍 Start: Koregaon Park (18.5210, 73.8584)`);
    console.log(`  📍 End: Pune City Center (18.5315, 73.8710)`);
    console.log(`  📏 Distance: ~5.0km (via street routing)`);
    console.log(`  🕐 Duration: ~${totalMinutes} minutes`);
    console.log(`  🛑 Breaks: 2 stops (11 total pings)`);
    console.log(`\n🚀 Open Live Tracking → Click ${empName} to see the route!\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
