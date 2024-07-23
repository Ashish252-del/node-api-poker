const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        role_permission_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        permission_module_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        module_access: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        add_access: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        edit_access: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        view_access: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        delete_access: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
    };
    return sequelize.define('assign_role_permissions', attributes, { timestamps: true });
}
