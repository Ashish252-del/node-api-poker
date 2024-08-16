const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        table_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        tournament_table_id: {
            type: DataTypes.STRING,
        },
        tournament_category: {
            type: DataTypes.STRING,
            allowNull: true
        },
        players: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tournament_id : {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        game_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        winner: {
            type: DataTypes.STRING,
            allowNull: true
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tournament_table_number: {
            type: DataTypes.INTEGER,
        },
        game_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        bet_amount: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        percentage: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        tournament_table_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['Pending', 'Active', 'Leave', 'Full', 'Completed'],
            defaultValue: 'Pending'
        },
        player_disconnected_count: {
            type: DataTypes.INTEGER,
            values: [0, 1, 2],
            defaultValue: 0,
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
        }
    };

    return sequelize.define('tournament_tables', attributes, { timestamps: true });
}