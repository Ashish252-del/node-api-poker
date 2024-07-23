'use strict';
const { encryptPassword } = require("../utils");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('users', [{
      full_name: 'Admin',
      username: 'admin',
      email: 'admin@gmail.com',
      password: await encryptPassword('admin@123'),
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('users', null, {});
  }
};
