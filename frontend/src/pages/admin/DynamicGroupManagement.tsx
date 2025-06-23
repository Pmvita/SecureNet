import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button/Button';
import { Card } from '../../components/common/Card/Card';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Badge } from '../../components/common/Badge/Badge';
import { Tabs } from '../../components/common/Tabs/Tabs';

interface GroupRule {
  id: number;
  group_id: number;
  attribute_name: string;
  operator: string;
  value: any;
  is_active: boolean;
  priority: number;
  description: string;
  created_at: string;
  updated_at: string;
}

interface RuleSet {
  id: number;
  group_id: number;
  name: string;
  condition: 'and' | 'or' | 'not';
  rules: GroupRule[];
  is_active: boolean;
  created_at: string;
}

interface UserGroup {
  id: number;
  name: string;
  description: string;
  group_type: string;
  is_system_group: boolean;
  member_count: number;
}

interface EvaluationResult {
  user_id: number;
  group_id: number;
  should_be_member: boolean;
  reasons: string[];
  user_attributes: any;
}

const DynamicGroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [rules, setRules] = useState<GroupRule[]>([]);
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResult[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isRuleSetModalOpen, setIsRuleSetModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rule form state
  const [newRule, setNewRule] = useState({
    attribute_name: '',
    operator: 'equals',
    value: '',
    description: '',
    priority: 0
  });

  // Rule set form state
  const [newRuleSet, setNewRuleSet] = useState({
    name: '',
    condition: 'and' as 'and' | 'or' | 'not',
    rule_ids: [] as number[]
  });

  const attributeOptions = [
    { value: 'role', label: 'User Role' },
    { value: 'department', label: 'Department' },
    { value: 'position', label: 'Position' },
    { value: 'email_domain', label: 'Email Domain' },
    { value: 'account_type', label: 'Account Type' },
    { value: 'organization', label: 'Organization' },
    { value: 'days_until_expiry', label: 'Days Until Expiry' },
    { value: 'is_active', label: 'Is Active' },
    { value: 'group_count', label: 'Group Count' }
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Not Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'in_list', label: 'In List' },
    { value: 'not_in_list', label: 'Not In List' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'is_null', label: 'Is Null' },
    { value: 'is_not_null', label: 'Is Not Null' }
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupRules(selectedGroup.id);
      loadGroupRuleSets(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/groups');
      const data = await response.json();
      setGroups(data.groups || []);
      if (data.groups?.length > 0) {
        setSelectedGroup(data.groups[0]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupRules = async (groupId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/groups/${groupId}/rules`);
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error loading group rules:', error);
    }
  };

  const loadGroupRuleSets = async (groupId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/groups/${groupId}/rule-sets`);
      const data = await response.json();
      setRuleSets(data.rule_sets || []);
    } catch (error) {
      console.error('Error loading rule sets:', error);
    }
  };

  const createRule = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/groups/${selectedGroup.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });

      if (response.ok) {
        setIsRuleModalOpen(false);
        setNewRule({
          attribute_name: '',
          operator: 'equals',
          value: '',
          description: '',
          priority: 0
        });
        loadGroupRules(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const createRuleSet = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/groups/${selectedGroup.id}/rule-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRuleSet)
      });

      if (response.ok) {
        setIsRuleSetModalOpen(false);
        setNewRuleSet({
          name: '',
          condition: 'and',
          rule_ids: []
        });
        loadGroupRuleSets(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error creating rule set:', error);
    }
  };

  const evaluateRules = async () => {
    if (!selectedGroup) return;

    setIsEvaluating(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/groups/${selectedGroup.id}/evaluate`, {
        method: 'POST'
      });
      const data = await response.json();
      setEvaluationResults(data.evaluation_results || []);
    } catch (error) {
      console.error('Error evaluating rules:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const applyRuleChanges = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/groups/apply-rules', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Refresh data
        loadGroups();
        if (selectedGroup) {
          loadGroupRules(selectedGroup.id);
          evaluateRules();
        }
      }
    } catch (error) {
      console.error('Error applying rules:', error);
    }
  };

  const toggleRule = async (ruleId: number, isActive: boolean) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/admin/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (selectedGroup) {
        loadGroupRules(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (ruleId: number) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/admin/rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (selectedGroup) {
        loadGroupRules(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const renderRuleBuilder = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Attribute
          </label>
          <Select
            value={newRule.attribute_name}
            onChange={(value) => setNewRule(prev => ({ ...prev, attribute_name: value }))}
            options={attributeOptions}
            placeholder="Select attribute"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operator
          </label>
          <Select
            value={newRule.operator}
            onChange={(value) => setNewRule(prev => ({ ...prev, operator: value }))}
            options={operatorOptions}
            placeholder="Select operator"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Value
          </label>
          <Input
            type="text"
            value={newRule.value}
            onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
            placeholder="Enter value"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <Input
            type="text"
            value={newRule.description}
            onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe this rule"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority (0-100)
          </label>
          <Input
            type="number"
            value={newRule.priority}
            onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
            placeholder="0"
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Rule Preview</h4>
        <p className="text-blue-800">
          {newRule.attribute_name && newRule.operator && newRule.value
            ? `Assign users to ${selectedGroup?.name} when ${newRule.attribute_name} ${newRule.operator} "${newRule.value}"`
            : 'Configure rule parameters to see preview'
          }
        </p>
      </div>
    </div>
  );

  const renderRulesList = () => (
    <div className="space-y-4">
      {rules.map((rule) => (
        <Card key={rule.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline">Priority: {rule.priority}</Badge>
              </div>
              <h4 className="font-medium text-gray-900">
                {rule.description || 'Unnamed Rule'}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {rule.attribute_name} {rule.operator} "{rule.value}"
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={rule.is_active ? "secondary" : "primary"}
                onClick={() => toggleRule(rule.id, rule.is_active)}
              >
                {rule.is_active ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteRule(rule.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {rules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No rules configured for this group. Create your first rule to get started.
        </div>
      )}
    </div>
  );

  const renderRuleSets = () => (
    <div className="space-y-4">
      {ruleSets.map((ruleSet) => (
        <Card key={ruleSet.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{ruleSet.name}</h4>
              <Badge variant={ruleSet.is_active ? 'success' : 'secondary'}>
                {ruleSet.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">{ruleSet.condition.toUpperCase()}</Badge>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {ruleSet.rules.length} rules in this set
          </div>
        </Card>
      ))}

      {ruleSets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No rule sets configured. Create rule sets to combine multiple rules with logical conditions.
        </div>
      )}
    </div>
  );

  const renderEvaluationResults = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Rule Evaluation Results</h3>
        <div className="flex gap-2">
          <Button onClick={evaluateRules} disabled={isEvaluating || !selectedGroup}>
            {isEvaluating ? 'Evaluating...' : 'Evaluate Rules'}
          </Button>
          <Button onClick={applyRuleChanges} variant="success">
            Apply Changes
          </Button>
        </div>
      </div>

      {evaluationResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {evaluationResults.filter(r => r.should_be_member).length}
            </div>
            <div className="text-sm text-gray-600">Users to Add</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {evaluationResults.filter(r => !r.should_be_member).length}
            </div>
            <div className="text-sm text-gray-600">Users to Remove</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {evaluationResults.length}
            </div>
            <div className="text-sm text-gray-600">Total Evaluated</div>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {evaluationResults.slice(0, 10).map((result, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">User {result.user_id}</span>
                  <Badge variant={result.should_be_member ? 'success' : 'destructive'}>
                    {result.should_be_member ? 'Should be member' : 'Should not be member'}
                  </Badge>
                </div>
                {result.reasons.length > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    Reasons: {result.reasons.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {evaluationResults.length > 10 && (
          <div className="text-center text-gray-500">
            Showing 10 of {evaluationResults.length} results
          </div>
        )}

        {evaluationResults.length === 0 && !isEvaluating && (
          <div className="text-center py-8 text-gray-500">
            Click "Evaluate Rules" to see how current rules would affect group membership.
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    {
      id: 'rules',
      label: 'Individual Rules',
      content: (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Group Assignment Rules</h3>
            <Button onClick={() => setIsRuleModalOpen(true)}>
              Create Rule
            </Button>
          </div>
          {renderRulesList()}
        </div>
      )
    },
    {
      id: 'rule-sets',
      label: 'Rule Sets',
      content: (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Rule Sets</h3>
            <Button onClick={() => setIsRuleSetModalOpen(true)}>
              Create Rule Set
            </Button>
          </div>
          {renderRuleSets()}
        </div>
      )
    },
    {
      id: 'evaluation',
      label: 'Rule Evaluation',
      content: renderEvaluationResults()
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dynamic Group Management</h1>
          <p className="text-gray-600 mt-1">
            Configure automatic group assignment rules based on user attributes
          </p>
        </div>
      </div>

      {/* Group Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Select Group</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={`p-4 cursor-pointer border-2 transition-colors ${
                selectedGroup?.id === group.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-600">{group.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{group.group_type}</Badge>
                    <span className="text-sm text-gray-500">
                      {group.member_count} members
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Main Content */}
      {selectedGroup && (
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium">
              Managing Rules for: {selectedGroup.name}
            </h2>
            <p className="text-gray-600">{selectedGroup.description}</p>
          </div>

          <Tabs tabs={tabs} defaultTab="rules" />
        </Card>
      )}

      {/* Create Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Group Assignment Rule"
        size="lg"
      >
        <div className="space-y-6">
          {renderRuleBuilder()}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createRule}>
              Create Rule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Rule Set Modal */}
      <Modal
        isOpen={isRuleSetModalOpen}
        onClose={() => setIsRuleSetModalOpen(false)}
        title="Create Rule Set"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Set Name
            </label>
            <Input
              type="text"
              value={newRuleSet.name}
              onChange={(e) => setNewRuleSet(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter rule set name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logical Condition
            </label>
            <Select
              value={newRuleSet.condition}
              onChange={(value) => setNewRuleSet(prev => ({ ...prev, condition: value as 'and' | 'or' | 'not' }))}
              options={[
                { value: 'and', label: 'AND - All rules must match' },
                { value: 'or', label: 'OR - Any rule must match' },
                { value: 'not', label: 'NOT - None of the rules must match' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Rules
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {rules.map((rule) => (
                <label key={rule.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRuleSet.rule_ids.includes(rule.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewRuleSet(prev => ({
                          ...prev,
                          rule_ids: [...prev.rule_ids, rule.id]
                        }));
                      } else {
                        setNewRuleSet(prev => ({
                          ...prev,
                          rule_ids: prev.rule_ids.filter(id => id !== rule.id)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {rule.description || `${rule.attribute_name} ${rule.operator} ${rule.value}`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsRuleSetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createRuleSet}>
              Create Rule Set
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DynamicGroupManagement; 