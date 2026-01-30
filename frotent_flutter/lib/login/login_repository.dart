// ignore_for_file: avoid_print

import 'package:frotent_flutter/user/user_model.dart';
import 'package:dio/dio.dart';

class LoginRepository {
  final Dio _dio;

  LoginRepository(this._dio);

  Future<UserModel> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '/api/login',
        data: {'username': username, 'password': password},
      );

      if (response.statusCode == 200) {
        return UserModel.fromJson(response.data);
      } else {
        throw Exception('Failed to login');
      }
    } on DioException catch (error) {
      final message = error.response?.data['message'] ?? 'Erro de conexão';
      throw Exception(message);
    }
  }
}
