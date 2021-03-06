import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Page,
  Navbar,
  NavLeft,
  NavTitle,
  NavRight,
  Button,
  List,
  ListInput,
  f7,
} from 'framework7-react';
import { Visibility, VisibilityOff, ArrowBackIos } from '@material-ui/icons';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import './styles.css';

import { getTokens, addNewPasswordRequest } from '../../store/user';

const ChangePassword = () => {
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(
    false
  );
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const userTokens = useSelector(getTokens);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userTokens || !userTokens.authToken) {
      f7.views.main.router.navigate('/');
      return;
    }
  }, []);

  const handleFormSubmission = async (values) => {
    const { currentPassword, newPassword } = values;
    dispatch(
      addNewPasswordRequest(userTokens.authToken, currentPassword, newPassword)
    );

    formik.setSubmitting(false);
    f7.views.main.router.navigate(`/profile/`);
  };

  const toggleCurrentPasswordVisibility = () => {
    setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
  };

  const toggleNewPasswordVisibility = () => {
    setIsNewPasswordVisible(!isNewPasswordVisible);
  };

  const validationSchema = Yup.object().shape({
    currentPassword: Yup.string().required('Required'),
    newPassword: Yup.string()
      .required('Required')
      .matches(
        /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/i,
        'Please create a password between 8 to 15 characters, comprising a mix of uppercase and lowercase letters, numbers and symbols'
      ),
  });

  const formik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      handleFormSubmission(values);
    },
  });

  return (
    <Page className="change-password-page white-background-skin">
      <form onSubmit={formik.handleSubmit}>
        <Navbar>
          <NavLeft>
            <Button
              onClick={() => {
                f7.views.main.router.navigate(`/profile/`, { animate: false });
              }}
            >
              <ArrowBackIos />
            </Button>
          </NavLeft>
          <NavTitle>Change Password</NavTitle>
          <NavRight>
            <Button type="submit" disabled={formik.isSubmitting}>
              Update
            </Button>
          </NavRight>
        </Navbar>

        <div className="padding">
          <List noHairlines>
            <ListInput
              outline
              floatingLabel
              type={isCurrentPasswordVisible ? 'text' : 'password'}
              label="Current Password"
              placeholder="Current Password"
              disabled={formik.isSubmitting}
              {...formik.getFieldProps('currentPassword')}
            >
              <span
                slot="input"
                className="visibility-icon"
                onClick={toggleCurrentPasswordVisibility}
              >
                {isCurrentPasswordVisible ? <VisibilityOff /> : <Visibility />}
              </span>
              <div slot="root-end" className="error-message">
                {formik.touched.currentPassword && formik.errors.currentPassword
                  ? formik.errors.currentPassword
                  : ''}
              </div>
            </ListInput>

            <ListInput
              outline
              floatingLabel
              type={isNewPasswordVisible ? 'text' : 'password'}
              label="New Password"
              placeholder="New Password"
              disabled={formik.isSubmitting}
              {...formik.getFieldProps('newPassword')}
            >
              <span
                slot="input"
                className="visibility-icon"
                onClick={toggleNewPasswordVisibility}
              >
                {isNewPasswordVisible ? <VisibilityOff /> : <Visibility />}
              </span>
              <div slot="root-end" className="error-message">
                {formik.touched.newPassword && formik.errors.newPassword
                  ? formik.errors.newPassword
                  : ''}
              </div>
            </ListInput>
          </List>
        </div>
      </form>
    </Page>
  );
};

export default ChangePassword;
