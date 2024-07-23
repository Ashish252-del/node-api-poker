const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        admin_activity_log_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        activity_type : {
            type: DataTypes.STRING,
            allowNull: true,
        },
        old_value: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        new_value: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    };

    return sequelize.define('admin_activity_logs', attributes, { timestamps: false });
}
