const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        tournament_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        game_category : {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_type: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        winner_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tournament_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        tournament_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        scheduled_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        tournament_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2','3'],  // 0 =inactive, 1=active, 2=completed , 3=deleted
            defaultValue: '1',
        },
        player_type: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type:DataTypes.INTEGER,
            allowNull:false,          // 1 = ready , 0= not started , 2= completed
            defaultValue:0
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

    return sequelize.define('tournaments', attributes,  { timestamps: true });
}
