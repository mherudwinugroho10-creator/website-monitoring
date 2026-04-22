// Generate dummy users
export function generateDummyUsers(count) {
  const users = [];
  const roles = ['user', 'admin'];
  const names = [
    'Ahmad Supir', 'Budi Santoso', 'Candra Wijaya', 'Dedi Kurniawan',
    'Eko Prasetyo', 'Fajar Nugroho', 'Gunawan Setiawan', 'Hendra Kusuma',
    'Irfan Hakim', 'Joko Widodo', 'Kemal Palevi', 'Lukman Hakim'
  ];
  
  for (var i = 0; i < count; i++) {
    var name = names[i % names.length];
    var email = name.toLowerCase().replace(' ', '.') + (i > 11 ? i : '') + '@email.com';
    var role = i === 0 ? 'admin' : roles[Math.floor(Math.random() * 10) > 8 ? 0 : 1];
    var createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    
    users.push({
      id: 'user_' + (i + 1),
      uid: 'uid_' + (i + 1),
      name: name,
      email: email,
      phone: '08' + Math.floor(1000000000 + Math.random() * 9000000000),
      role: role,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      vehicle_id: role === 'user' ? 'TRUCK_' + String(i + 1).padStart(3, '0') : null,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
  }
  
  return users;
}

// Generate dummy vehicles
export function generateDummyVehicles(count) {
  var vehicles = [];
  var types = ['Truck', 'Bus', 'Trailer'];
  var brands = ['Hino', 'Isuzu', 'Mitsubishi', 'Toyota', 'Mercedes'];
  var models = ['500 Series', 'Giga', 'Fuso', 'Dyna', 'Actros'];
  
  for (var i = 0; i < count; i++) {
    var type = types[Math.floor(Math.random() * types.length)];
    var brand = brands[Math.floor(Math.random() * brands.length)];
    var model = models[Math.floor(Math.random() * models.length)];
    var year = 2018 + Math.floor(Math.random() * 7);
    var plateNum = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    var plate = 'B ' + (1000 + Math.floor(Math.random() * 9000)) + ' ' + plateNum + plateNum + plateNum;
    var createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
    
    vehicles.push({
      id: 'vehicle_' + (i + 1),
      vehicle_id: 'TRUCK_' + String(i + 1).padStart(3, '0'),
      plate_number: plate,
      vehicle_type: type,
      brand: brand,
      model: model,
      year: year,
      driver_id: Math.random() > 0.2 ? 'user_' + (i + 1) : null,
      driver_name: Math.random() > 0.2 ? 'Driver ' + (i + 1) : 'Unassigned',
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      speed_limit: 60,
      pitch_threshold: 15,
      roll_threshold: 10,
      createdAt: createdAt,
      updatedAt: createdAt,
    });
  }
  
  return vehicles;
}

// Get admin dashboard stats
export function getAdminStats(users, vehicles) {
  var activeUsers = users.filter(function(u) { return u.status === 'active'; }).length;
  var totalAdmins = users.filter(function(u) { return u.role === 'admin'; }).length;
  var activeVehicles = vehicles.filter(function(v) { return v.status === 'active'; }).length;
  var assignedVehicles = vehicles.filter(function(v) { return v.driver_id !== null; }).length;
  
  return {
    totalUsers: users.length,
    activeUsers: activeUsers,
    totalAdmins: totalAdmins,
    totalVehicles: vehicles.length,
    activeVehicles: activeVehicles,
    assignedVehicles: assignedVehicles,
  };
}