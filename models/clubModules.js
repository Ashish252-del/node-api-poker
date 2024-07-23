const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        moduleId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        moduleName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isSidebar: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        apiMethod: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "0",
        },
        routes: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue:"0",
        },
        
        icon: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue:"",
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

    return sequelize.define('club_modules', attributes, { timestamps: true });
}
