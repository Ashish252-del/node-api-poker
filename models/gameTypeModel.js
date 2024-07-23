const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        game_type_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {   // For Poker name should be --> NLH , PLO , PLO 5 , PLO 6 
            type: DataTypes.STRING,
            allowNull: true
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true
        },
        parent_type: {               // --> NLH/TEXAS :- 1 , PLO :- 2 , PLO5 :-3 , POL6 :-4 
            type: DataTypes.INTEGER, 
            allowNull: true
        },
        game_category_id: {
            type: DataTypes.INTEGER, // 2 --> poker , 1--> Durak 
            allowNull: true
        },
        game_fields_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_type_status: {  // 1 --> active 
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '1',
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        club_type: {
            type: DataTypes.INTEGER,
            allowNull:false,
            defaultValue :0 // 0--> not a club type 
                       // 1 --> ring of club 
                       // 2 --> SNG of club 
                       // 3 --> SPIN UP of club 
                       // 4 --> MTT REGULAR of club 
                       // 5 --> MTT SETELLITE of club
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: DataTypes.NOW
        },
    };

    return sequelize.define('game_types', attributes,  { timestamps: true });
}
