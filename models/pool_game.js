const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        game_id: {
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
        table_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        target_lines: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        prize: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        win_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        game_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '1',
        },
        added_by: {
            type: DataTypes.INTEGER,
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
    return sequelize.define('games', attributes,  { timestamps: true });
}
