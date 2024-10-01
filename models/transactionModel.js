const { DataTypes } = require('sequelize');

module.exports = model;
function model(sequelize) {
    const attributes = {
        transaction_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        order_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        table_id:{
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_deposit:{
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        type: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ['CR','DR']
        },
        amount_type_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        other_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        opening_balance: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true,
        },
        closing_balance: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        transaction_status:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_admin:{
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        real_amount:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        win_amount:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        bonus_amount:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        commission:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        gst_amount:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        discount:{
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0
        },
        reference:{
            type: DataTypes.STRING,
            allowNull: true,
        },
        upi_txn_id:{
            type: DataTypes.TEXT,
            allowNull: true,
        },
        cust_ref_no:{
            type: DataTypes.STRING,
            allowNull: true,
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

    return sequelize.define('transactions', attributes, { timestamps: true });
}
