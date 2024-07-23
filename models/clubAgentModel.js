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
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        agent_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        chips: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
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
    return sequelize.define('club_agents', attributes);
}
