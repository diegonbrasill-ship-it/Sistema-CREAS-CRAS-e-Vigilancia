"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
class UsersController {
    static async list(req, res) {
        const { whereClause, params } = req.accessFilter;
        try {
            const users = users_service_1.UsersService.listUsers(whereClause, params);
            res.json(users);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    static async create(req, res) {
        try {
            const newUser = users_service_1.UsersService.createUsers(req.body, req.user);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    static async update(req, res) {
        try {
            const updated = await users_service_1.UsersService.updateUser(req.params.id, req.body, req.user);
            res.json(updated);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
}
exports.UsersController = UsersController;
