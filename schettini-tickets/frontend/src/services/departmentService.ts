import api from '../config/axiosConfig';

export interface Department {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface NewDepartment {
    name: string;
    description: string;
}

const departmentService = {
    /**
     * Fetches all departments from the API.
     * @param token The authentication token.
     * @returns A promise that resolves to an array of Department objects.
     */
    getAllDepartments: async (token: string): Promise<Department[]> => {
        const response = await api.get('/api/departments', {
            headers: { Authorization: `Bearer ${token}` },
        });
        // Ensure that response.data.departments is an array, default to empty array if not.
        return response.data.departments || [];
    },

    /**
     * Creates a new department.
     * @param token The authentication token.
     * @param department The new department data.
     * @returns A promise that resolves to the created Department object.
     */
    createDepartment: async (token: string, department: NewDepartment): Promise<Department> => {
        const response = await api.post('/api/departments', department, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    /**
     * Updates an existing department.
     * @param token The authentication token.
     * @param id The ID of the department to update.
     * @param department The partial department data to update.
     * @returns A promise that resolves to the updated Department object.
     */
    updateDepartment: async (token: string, id: number, department: Partial<NewDepartment>): Promise<Department> => {
        const response = await api.put(`/api/departments/${id}`, department, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    /**
     * Deletes a department by its ID.
     * @param token The authentication token.
     * @param id The ID of the department to delete.
     * @returns A promise that resolves when the department is deleted.
     */
    deleteDepartment: async (token: string, id: number): Promise<void> => {
        await api.delete(`/api/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

export default departmentService;
