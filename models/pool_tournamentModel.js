const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        tournament_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name : {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bet_amount: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        percentage: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tournament_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        prize: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tournament_table_status:{
            type: DataTypes.ENUM,
            allowNull: false,
            values:['Pending', 'Active', 'Leave','Full','Completed'],
            defaultValue: 'Pending'
        },
        tournament_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2','3'],      // 0 = inactive, 1 = active, 2 = completed, 3 = cancelled
            defaultValue: '1',
        },
        is_cancel: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1'],
            defaultValue: '0',
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        starting_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        ending_time: {
            type: DataTypes.DATE,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
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
    return sequelize.define('pool_tournament', attributes,  { timestamps: true });
}
