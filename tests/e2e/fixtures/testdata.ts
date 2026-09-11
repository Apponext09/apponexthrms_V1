export const testUsers = {
  admin: {
    email: 'harsh@gmail.com',
    password: 'harsh@gmail.com',
    role: 'admin',
  },
  hr: {
    email: 'hr@example.com',
    password: 'HR@123456',
    role: 'hr',
  },
  manager: {
    email: 'manager@example.com',
    password: 'Manager@123456',
    role: 'manager',
  },
  employee: {
    email: 'employee@example.com',
    password: 'Employee@123456',
    role: 'employee',
  },
};

export const testEmployeeData = {
  firstName: 'Test',
  lastName: 'Employee',
  email: 'testemployee@example.com',
  phone: '9876543210',
  dateOfBirth: '1990-01-15',
  gender: 'Male',
  department: 'Engineering',
  designation: 'Software Engineer',
  joiningDate: '2022-01-01',
};

export const testLeaveData = {
  leaveType: 'Sick Leave',
  fromDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
  toDate: new Date(new Date().getTime() + 8 * 24 * 60 * 60 * 1000),
  reason: 'Medical checkup',
};

export const testShiftData = {
  name: 'Test Shift',
  startTime: '09:00 AM',
  endTime: '06:00 PM',
  breakDuration: '1 hour',
};
