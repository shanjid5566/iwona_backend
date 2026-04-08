/**
 * Standardized API Response helper
 */
class ApiResponse {
  /**
   * Success response
   */
  static success(message, data = null, meta = null) {
    const response = {
      success: true,
      message,
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    if (meta !== null) {
      response.meta = meta;
    }
    
    return response;
  }
  
  /**
   * Error response
   */
  static error(message, errors = null) {
    const response = {
      success: false,
      message,
    };
    
    if (errors !== null) {
      response.errors = errors;
    }
    
    return response;
  }
  
  /**
   * Paginated response
   */
  static paginated(message, data, pagination) {
    return {
      success: true,
      message,
      data,
      pagination,
    };
  }
}

export { ApiResponse };
