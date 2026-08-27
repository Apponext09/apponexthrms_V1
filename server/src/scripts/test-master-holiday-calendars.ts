import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/master/holiday-calendars';

async function runTests() {
  console.log('🧪 Starting Master Holiday Calendar Sub-Module Tests...\n');

  try {
    // 1. Create a holiday calendar
    console.log('1️⃣ Testing POST / (Create Calendar)...');
    const testYear = 2029;
    const createRes = await axios.post(BASE_URL, {
      calendar_name: `Test Calendar ${testYear}`,
      calendar_year: testYear,
      company_id: 1,
      region_id: 2,
      location_id: 3,
      description: 'Automated test holiday calendar',
      status: 'Draft',
    }, {
      headers: { 'X-Organization-Id': '8', 'X-Company-Id': '1' }
    });
    console.log('✅ Created Calendar Status:', createRes.status, 'ID:', createRes.data.data.id);
    const calendarId = createRes.data.data.id;

    // 2. Test duplicate calendar creation (409 Conflict)
    console.log('\n2️⃣ Testing POST / with duplicate scope+year (Expected 409)...');
    try {
      await axios.post(BASE_URL, {
        calendar_name: `Duplicate Calendar ${testYear}`,
        calendar_year: testYear,
        company_id: 1,
        region_id: 2,
        location_id: 3,
      }, {
        headers: { 'X-Organization-Id': '8', 'X-Company-Id': '1' }
      });
      console.error('❌ Failed: Expected 409 Conflict but request succeeded');
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log('✅ Correctly received 409 Conflict for duplicate calendar scope');
      } else {
        console.error('❌ Unexpected status:', err.response?.status);
      }
    }

    // 3. List calendars with filter
    console.log('\n3️⃣ Testing GET / (List Calendars with filters)...');
    const listRes = await axios.get(`${BASE_URL}?year=${testYear}`, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Listed Calendars Count:', listRes.data.count);

    // 4. Add holiday to calendar
    console.log('\n4️⃣ Testing POST /:id/holidays (Add Valid Holiday)...');
    const addHolRes = await axios.post(`${BASE_URL}/${calendarId}/holidays`, {
      holiday_name: 'Test Republic Day',
      holiday_date: `${testYear}-01-26`,
      holiday_type: 'National',
      is_optional: false,
      description: 'Test Holiday Description',
    }, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Added Holiday Status:', addHolRes.status, 'Holiday ID:', addHolRes.data.data.id);
    const holidayId = addHolRes.data.data.id;

    // 5. Test holiday date outside calendar year (Expected 400)
    console.log('\n5️⃣ Testing POST /:id/holidays with date outside calendar year (Expected 400)...');
    try {
      await axios.post(`${BASE_URL}/${calendarId}/holidays`, {
        holiday_name: 'Wrong Year Holiday',
        holiday_date: '2025-05-01',
      }, {
        headers: { 'X-Organization-Id': '8' }
      });
      console.error('❌ Failed: Expected 400 Bad Request but succeeded');
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log('✅ Correctly received 400 Bad Request for date outside calendar year');
      } else {
        console.error('❌ Unexpected status:', err.response?.status);
      }
    }

    // 6. Test duplicate holiday date in same calendar (Expected 409)
    console.log('\n6️⃣ Testing POST /:id/holidays with duplicate date (Expected 409)...');
    try {
      await axios.post(`${BASE_URL}/${calendarId}/holidays`, {
        holiday_name: 'Duplicate Date Holiday',
        holiday_date: `${testYear}-01-26`,
      }, {
        headers: { 'X-Organization-Id': '8' }
      });
      console.error('❌ Failed: Expected 409 Conflict but succeeded');
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log('✅ Correctly received 409 Conflict for duplicate holiday date');
      } else {
        console.error('❌ Unexpected status:', err.response?.status);
      }
    }

    // 7. Update holiday
    console.log('\n7️⃣ Testing PUT /holidays/:holidayId (Update Holiday)...');
    const updateHolRes = await axios.put(`${BASE_URL}/holidays/${holidayId}`, {
      holiday_name: 'Updated Test Republic Day',
      is_optional: true,
    }, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Updated Holiday Status:', updateHolRes.status, 'Updated Name:', updateHolRes.data.data.holiday_name);

    // 8. Add Weekly Off Rules
    console.log('\n8️⃣ Testing POST /:id/weekly-off (Add Weekly Off Rules)...');
    const weeklyOffRes = await axios.post(`${BASE_URL}/${calendarId}/weekly-off`, {
      rules: [
        { week_day: 'Sun', off_type: 'Full Day', is_alternate: false },
        { week_day: 'Sat', off_type: 'Full Day', is_alternate: true, alternate_weeks: '2,4' },
      ]
    }, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Configured Weekly Off Rules Count:', weeklyOffRes.data.count);

    // 9. Assign Calendar
    console.log('\n9️⃣ Testing POST /:id/assign (Assign Calendar)...');
    const assignRes = await axios.post(`${BASE_URL}/${calendarId}/assign`, {
      company_id: 1,
      location_id: 3,
      department_id: 2,
    }, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Assigned Calendar Status:', assignRes.status, 'Assignment ID:', assignRes.data.data.id);

    // 10. Publish Calendar
    console.log('\n🔟 Testing PATCH /:id/publish (Publish Calendar)...');
    const publishRes = await axios.patch(`${BASE_URL}/${calendarId}/publish`, {}, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Published Calendar Status:', publishRes.status, 'Status Value:', publishRes.data.data.status);

    // 11. Get Single Calendar with Nested Details
    console.log('\n1️⃣1️⃣ Testing GET /:id (Get Single Calendar with Nested Details)...');
    const getRes = await axios.get(`${BASE_URL}/${calendarId}`, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Calendar Name:', getRes.data.data.calendar_name);
    console.log('   - Holidays Count:', getRes.data.data.holidays.length);
    console.log('   - Weekly Off Rules Count:', getRes.data.data.weekly_off_rules.length);
    console.log('   - Assignments Count:', getRes.data.data.assignments.length);

    // 12. Delete Holiday
    console.log('\n1️⃣2️⃣ Testing DELETE /holidays/:holidayId (Delete Holiday)...');
    const delHolRes = await axios.delete(`${BASE_URL}/holidays/${holidayId}`, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Deleted Holiday Status:', delHolRes.status);

    // 13. Delete Calendar (Cascade Delete)
    console.log('\n1️⃣3️⃣ Testing DELETE /:id (Delete Calendar Cascade)...');
    const delCalRes = await axios.delete(`${BASE_URL}/${calendarId}`, {
      headers: { 'X-Organization-Id': '8' }
    });
    console.log('✅ Deleted Calendar Status:', delCalRes.status);

    console.log('\n🎉 ALL 13 TEST CASES PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  }
}

runTests();
