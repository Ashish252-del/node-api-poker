const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        admin_login_log_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        device_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        device_type: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ['iPhone', 'Android', 'Tablet'],
        },
        mac_address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        app_version: {
            type: DataTypes.STRING,
            allowNull: true
        },
        os_version: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ip: {
            type: DataTypes.STRING,
            allowNull: true
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    };

    return sequelize.define('admin_login_logs', attributes, { timestamps: false });
}
