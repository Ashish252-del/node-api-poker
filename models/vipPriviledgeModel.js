const { DataTypes } = require('sequelize');

module.exports = model;
function model(sequelize) {
    const attributes = {
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        card_feature_title: {
            type: DataTypes.STRING,
            allowNull: true
        },
        days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        all_in_equity: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rabbit_hunting: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        more_login_report: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        retail_detail: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        rival_data_display: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        club_data: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        extra_disconnect_protection: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        exclusive_emojis: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        club_creation_limit: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        free_emojis: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        free_time_bank: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        purchase_diamond: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        purchase_coin: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        purchase_point: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '1',
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
    return sequelize.define('vip_priviledges', attributes);
}
