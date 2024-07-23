const { DataTypes } = require('sequelize');

module.exports = model;
function model(sequelize) {
    const attributes = {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        club_id: {
            type: DataTypes.INTEGER
        },
        user_id: {
            type: DataTypes.INTEGER
        },
        chips: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        type: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ['CR','DR']
        },
        is_club_admin: {
            type: DataTypes.BOOLEAN
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
    return sequelize.define('club_trade_history', attributes);
}
