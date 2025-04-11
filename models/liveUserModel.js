const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id:{
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        game_type:{
            type: DataTypes.STRING,
            allowNull: true
        },
        livedate:{
            type: DataTypes.STRING,
            allowNull: true
        },
    };
    return sequelize.define('live_users', attributes, { timestamps: true });
}