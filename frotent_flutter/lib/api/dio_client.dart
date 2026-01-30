import 'package:dio/dio.dart';

class DioClient {
  DioClient._internal();

  static final DioClient _singleton = DioClient._internal();

  factory DioClient() => _singleton;

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: "http://localhost:4000",
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      contentType: 'application/json',
    ),
  )..interceptors.add(LogInterceptor(responseBody: true));

  Dio get dio => _dio;
}
