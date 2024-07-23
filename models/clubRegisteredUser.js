const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        registeration_Id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        clubId: {
            allowNull: false,
            type: DataTypes.INTEGER
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_club_admin: {
            type: DataTypes.BOOLEAN
        },
        is_approve: {
            type: DataTypes.ENUM,
            allowNull: false,
            defaultValue: '0', // 0 means pending status 1 --> accepeted , 2 --> rejected 
            values: ['0', '1', '2']
        },
        amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        deducted_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        chips: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        locked_amount: {
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
    return sequelize.define('club_registered_user', attributes);
}
