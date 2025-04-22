const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        user_game_status_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        game_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ['1','2']
        },
        block_time: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_game_status:{
            type: DataTypes.ENUM,
            allowNull: true,
            values: ['Block','Active','Inactive']
        },
        block_timestamp:{
            type: DataTypes.STRING,
            allowNull: true
        },
        is_blocked_until_unblock: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false // comment: 'If true, user remains blocked until manually unblocked'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE
        },
    };

    return sequelize.define('user_game_status', attributes, { timestamps: true });
}
