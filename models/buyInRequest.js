const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        request_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        table_id: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        club_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        request_status:{
            type: DataTypes.ENUM,
            allowNull: false,
            values:['Pending', 'Rejected', 'Accepted','Na'],
            defaultValue: 'Pending'
        },
        club_owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
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

    return sequelize.define('buy_in_requests', attributes,  { timestamps: true });
}
