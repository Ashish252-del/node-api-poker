const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        admin_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        full_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Username already in use!",
            },
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Email address already in use!",
            },
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: "Mobile already in use!",
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        gender: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["Male", "Female"],
        },
        dob: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        profile_image: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        referral_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        friend_refer_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        commission: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        admin_status: {
            type: DataTypes.ENUM,
            allowNull: true,
            values: ["0", "1", "2"],
        },
        is_verify: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ["0", "1"],
            defaultValue: '0',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
    };

    return sequelize.define('admins', attributes,  { timestamps: true });
}
