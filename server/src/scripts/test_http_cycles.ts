import axios from 'axios';
import { generateAccessToken } from '../common/lib/jwt';
import { v4 as uuidv4 } from 'uuid';

async function testHttp() {
  const token = generateAccessToken({
    userId: 1,
    email: 'admin@apponexthrms.com',
    role: 'superadmin',
    organizationId: 1,
    sessionUuid: uuidv4()
  } as any);

  console.log('Testing HTTP POST /payroll/cycles...');
  try {
    const postRes = await axios.post(
      'http://127.0.0.1:5000/api/v1/payroll/cycles',
      {
        name: 'HTTP Test Cycle',
        cycle_name: 'HTTP Test Cycle',
        frequency: 'Monthly',
        isDailyWages: true,
        dailyWagesIncludePaidHolidays: true,
        dailyWagesIncludeWeekOff: true,
        startDate: 1,
        cutoffDay: 0,
        monthOffset: 'First',
        disbursementDate: 27,
        capAmount: 3,
        isActive: true
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('HTTP POST SUCCESS:', postRes.status, postRes.data);

    const savedId = postRes.data?.data?.id || postRes.data?.id;
    if (savedId) {
      console.log(`Testing HTTP PUT /payroll/cycles/${savedId}...`);
      const putRes = await axios.put(
        `http://127.0.0.1:5000/api/v1/payroll/cycles/${savedId}`,
        {
          name: 'HTTP Updated Cycle',
          cycle_name: 'HTTP Updated Cycle',
          frequency: 'Monthly',
          isDailyWages: true,
          dailyWagesIncludePaidHolidays: true,
          dailyWagesIncludeWeekOff: true,
          startDate: 1,
          cutoffDay: 5,
          monthOffset: 'Current',
          disbursementDate: 28,
          capAmount: 5000,
          isActive: true
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('HTTP PUT SUCCESS:', putRes.status, putRes.data);
    }
  } catch (err: any) {
    console.error('HTTP ERROR:', err.response?.status, err.response?.data || err.message);
  }
}

testHttp();
