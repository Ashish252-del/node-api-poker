const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        leaderboard_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        game_category: {
            type: DataTypes.STRING,
            allowNull: true
        },
        game_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true
        },
        rank: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        winning: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        game_played: {
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

    return sequelize.define('leaderboard', attributes,  { timestamps: true });
}
