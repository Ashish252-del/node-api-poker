const { DataTypes } = require('sequelize');

module.exports = model;
function model(sequelize) {
    const attributes = {
      clubId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      club_name: {
        type: DataTypes.STRING
      },
      club_notice: {
        type: DataTypes.TEXT
      },
      image: {
        type: DataTypes.TEXT
      },
      club_unique_id: {
        type: DataTypes.STRING
      },
      club_adminId: {
        type: DataTypes.INTEGER
      },
      club_status: {
        type: DataTypes.ENUM,
        allowNull: false,
        defaultValue: '1', // 0 means pending status 1 --> accepeted , 2 --> rejected
        values: ['0', '1', '2']
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    };
    return sequelize.define('club', attributes);
}
