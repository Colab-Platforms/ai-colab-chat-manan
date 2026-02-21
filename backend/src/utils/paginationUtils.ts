export const getPaginationOptions = (query: any, defaultPageSize: number) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || defaultPageSize, 1), 100);
    return {
        take: pageSize,
        skip: (page - 1) * pageSize,
        page,
        pageSize,
    };
};

export const formatPaginationResponse = (data: any[], totalRecords: number, page: number, pageSize: number) => {
    const totalPages = Math.ceil(totalRecords / pageSize);
    return {
        currentPage: page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        data,
    };
};