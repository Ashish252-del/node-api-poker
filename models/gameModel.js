const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        game_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        game_category_id : {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_type_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        game_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_prize_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_blind_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_price_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_blind_structure_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2','3'],
            defaultValue: '1',
        },
        is_tournament: {
            type:DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        varient_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_single_table: {
            type:DataTypes.BOOLEAN,
            allowNull: true,
        },
        is_game_finished: {
            type:DataTypes.BOOLEAN,
            allowNull: true,
        },
        club_id: {
          type:DataTypes.INTEGER,
          allowNull:false,
          defaultValue:'0' // 0 means it's not a club game 
        },
        is_club_template: {
            type:DataTypes.INTEGER,
            allowNull:false ,
            defaultValue:0 // 0--> not a club tamplet , 1 --> a tamplet 
        },
        private_table_code:{
            type:DataTypes.STRING,
            allowNull:false,
            defaultValue:0 // 0 means it's not a private table
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
